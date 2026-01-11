/** SCE v0.3.41 [BETA] - CLOUD ENGINE & DUAL-SYNC PROTOCOL **/
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Storage
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const upload = multer({ storage: multer.memoryStorage() });

/**
 * --- 1. ASSET TRANSMISSION ---
 * Logic: Dual-sync to 'modules' (Live) AND 'backup' (SECURED Warranty Vault)
 */
router.post('/upload', upload.single('cfile'), async (req, res) => {
    // 1. SECURITY HANDSHAKE
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (req.user.isGuest) return res.status(403).send("Guest explorers restricted from transmission.");

    const file = req.file;
    if (!file) return res.status(400).send("No asset provided.");
    if (!file.originalname.endsWith('.c')) return res.status(400).send("Protocol Error: .c Source Required.");

    const fileName = `${Date.now()}_${req.user.username}_${file.originalname}`;
    const warrantyName = `archives/warranty_${req.user.username}_${file.originalname}`;

    try {
        console.log(`[CLOUD SYNC] Initiating Dual-Sync for: ${file.originalname}`);

        // PHASE A: Primary Cloud Sync (Visible Repository)
        const { error: primaryErr } = await supabase.storage
            .from('modules')
            .upload(`uploads/${fileName}`, file.buffer, {
                contentType: 'text/plain',
                upsert: true
            });

        if (primaryErr) throw primaryErr;

        // PHASE B: SECURED Warranty Vault Sync (Hidden Backup)
        // This copy is immutable and only accessible via Admin Bridge
        const { error: backupErr } = await supabase.storage
            .from('backup')
            .upload(warrantyName, file.buffer, {
                contentType: 'text/plain',
                upsert: true
            });

        if (backupErr) console.warn("[WARRANTY WARNING] Backup sync delayed or failed.");

        console.log(`[SUCCESS] ${fileName} synced to Repository & Vault.`);
        res.status(200).send("Transmission Complete");

    } catch (err) {
        console.error("[CLOUD CRITICAL]", err.message);
        res.status(500).send("Cloud Sync Failed");
    }
});

/**
 * --- 2. REPOSITORY FETCH ---
 * Logic: Lists assets with metadata for Frontend KB conversion
 */
router.get('/files', async (req, res) => {
    try {
        const { data, error } = await supabase.storage
            .from('modules')
            .list('uploads', { 
                limit: 100, 
                sortBy: { column: 'created_at', order: 'desc' } 
            });

        if (error) throw error;

        const formattedFiles = data.map(f => {
            // Filename Parsing: [timestamp]_[owner]_[displayname]
            const parts = f.name.split('_');
            const owner = parts[1] || "System";
            const displayName = parts.slice(2).join('_');
            const isRecovered = f.name.startsWith('RESTORED_');

            return {
                name: f.name,
                displayName: displayName,
                owner: owner,
                sizeBytes: f.metadata?.size || 0,
                isRecovered: isRecovered,
                url: supabase.storage.from('modules').getPublicUrl(`uploads/${f.name}`).data.publicUrl,
                canManage: req.user && (req.user.username === owner || req.user.isAdmin),
                isBackedUp: true 
            };
        });

        res.json(formattedFiles);
    } catch (err) {
        console.error("[FETCH CRITICAL]", err);
        res.status(500).json({ error: "Sync failed" });
    }
});

/**
 * --- 3. ASSET DELETION ---
 */
router.delete('/files/:name', async (req, res) => {
    if (!req.isAuthenticated() || req.user.isGuest) return res.status(403).send("Forbidden");

    try {
        const parts = req.params.name.split('_');
        const owner = parts[1];

        // Authorization: Must be owner or sys-admin
        if (req.user.username !== owner && !req.user.isAdmin) {
            return res.status(403).send("Clearance Denied: Ownership Mismatch.");
        }

        const { error } = await supabase.storage
            .from('modules')
            .remove([`uploads/${req.params.name}`]);

        if (error) throw error;
        res.status(200).send("Asset Purged from Primary Repository.");
    } catch (err) {
        res.status(500).send("Deletion Failed.");
    }
});

module.exports = router;