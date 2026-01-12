/** SCE v1.0.5 [STABLE] - VAULT & AUTO-RETRIEVAL ENGINE **/
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * 1. CHECK RECOVERY (Synchronized with Identity Engine v1.0.4)
 */
router.get('/check-recovery', async (req, res) => {
    // Ensure this matches your passport/session setup
    if (!req.user) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const username = req.user.username;

    try {
        const { data: asset, error } = await supabase
            .from('assets')
            .select('name, recovery_key')
            .eq('owner_username', username)
            .eq('status', 'PENDING_KEY')
            .maybeSingle();

        if (error || !asset) {
            return res.json({ ready: false }); // FIXED: Changed 'pending' to 'ready' to match Frontend
        }

        res.json({ 
            ready: true, 
            filename: asset.name, 
            claimKey: asset.recovery_key // Mapping for consistency
        });

    } catch (err) {
        res.status(500).json({ error: "VAULT_CHECK_FAILURE" });
    }
});

/**
 * 2. VERIFY RECONSTITUTION
 */

router.post('/verify-reconstitution', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const { key } = req.body; 
    const username = req.user.username;

    try {
        // 1. Validate key
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

        // 2. RECONSTITUTION LOGIC
        const sourcePath = `archives/warranty_${username}_${asset.name}`;
        const destPath = `active/${username}/${asset.name}`;

        // Attempt direct copy (More efficient than Download -> Upload)
        const { error: copyErr } = await supabase.storage
            .from('backup')
            .copy(sourcePath, destPath, { destinationBucket: 'modules' });

        // If copy fails (cross-bucket limitation), fallback to memory transfer
        if (copyErr) {
            const { data: blob, error: dlErr } = await supabase.storage
                .from('backup').download(sourcePath);
            
            if (dlErr) throw new Error("VAULT_EXTRACTION_FAILED");

            const { error: ulErr } = await supabase.storage
                .from('modules').upload(destPath, blob, { upsert: true });
            
            if (ulErr) throw ulErr;
        }

        // 3. CLEANUP: Delete from backup and update DB
        await supabase.storage.from('backup').remove([sourcePath]);

        await supabase
            .from('assets')
                .update({ 
                status: 'active', 
                recovery_key: null, 
                storage_layer: 'modules',
                reconstituted_at: new Date()
            })
            .eq('id', asset.id);

        res.status(200).json({ 
            success: true, 
            message: "ASSET_RECONSTITUTED",
            filename: asset.name 
        });

    } catch (err) {
        console.error("RECON_ERR:", err);
        res.status(500).json({ error: "SYSTEM_HANDSHAKE_FAILURE" });
    }
});

module.exports = router;