/** SCE v1.0.4 - VAULT & AUTO-RETRIEVAL ENGINE **/
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Use Service Role Key for bucket-to-bucket move permissions
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * 1. CHECK RECOVERY (The "Auto-Fetch" Route)
 * This allows the user's Minibox to see the key once Admin has approved.
 */
router.get('/check-recovery', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const username = req.user.username;

    try {
        // Query the DB for a pending asset belonging to this user
        const { data: asset, error } = await supabase
            .from('assets')
            .select('name, recovery_key')
            .eq('owner_username', username)
            .eq('status', 'PENDING_KEY')
            .maybeSingle(); // Returns null safely if no file is pending

        if (error || !asset) {
            return res.json({ pending: false });
        }

        // Send the key to the user's frontend
        res.json({ 
            pending: true, 
            filename: asset.name, 
            key: asset.recovery_key 
        });

    } catch (err) {
        res.status(500).json({ error: "VAULT_CHECK_FAILURE" });
    }
});

/**
 * 2. VERIFY RECONSTITUTION (The Final Handshake)
 * Checks the 6-6-6-6 key and moves file from backup to active.
 */
router.post('/verify-reconstitution', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const { key } = req.body; 
    const username = req.user.username;

    try {
        // 1. Validate key against database
        const { data: asset, error: findError } = await supabase
            .from('assets')
            .select('*')
            .eq('owner_username', username)
            .eq('recovery_key', key)
            .eq('status', 'PENDING_KEY')
            .single();

        if (findError || !asset) {
            return res.status(403).json({ error: "INVALID_KEY_OR_EXPIRED" });
        }

        // 2. Reconstitution: Move from 'backup' bucket to 'modules'
        // Using the naming convention: warranty_[user]_[filename]
        const sourcePath = `archives/warranty_${username}_${asset.name}`;
        const destPath = `active/${username}/${asset.name}`;

        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup').download(sourcePath);

        if (dlErr) throw new Error("VAULT_EXTRACTION_FAILED");

        const { error: ulErr } = await supabase.storage
            .from('modules').upload(destPath, blob, { upsert: true });

        if (ulErr) throw ulErr;

        // 3. Update DB to Active & Wipe Key for security
        await supabase
            .from('assets')
            .update({ 
                status: 'active', 
                recovery_key: null, 
                storage_layer: 'modules' 
            })
            .eq('id', asset.id);

        res.status(200).json({ 
            success: true, 
            message: "ASSET_RECONSTITUTED",
            filename: asset.name 
        });

    } catch (err) {
        res.status(500).json({ error: "SYSTEM_HANDSHAKE_FAILURE" });
    }
});

module.exports = router;