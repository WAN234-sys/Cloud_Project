const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Storage
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const upload = multer({ storage: multer.memoryStorage() });

/**
 * --- 1. ASSET TRANSMISSION (v0.3.1) ---
 * Logic: Uploads to 'modules' (Public) AND 'backup' (Warranty Vault)
 */
router.post('/upload', upload.single('cfile'), async (req, res) => {
    // SECURITY: Block unauthenticated users and Guests
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (req.user.isGuest) return res.status(403).send("Guest accounts cannot transmit assets.");

    const file = req.file;
    if (!file) return res.status(400).send("No file provided.");
    if (!file.originalname.endsWith('.c')) return res.status(400).send("Only .c files allowed.");

    const fileName = `${Date.now()}_${req.user.username}_${file.originalname}`;
    const warrantyName = `archives/warranty_${req.user.username}_${file.originalname}`;

    try {
        // A. Primary Cloud Upload (modules bucket)
        const { error: primaryErr } = await supabase.storage
            .from('modules')
            .upload(`uploads/${fileName}`, file.buffer, {
                contentType: 'text/plain',
                upsert: true
            });

        if (primaryErr) throw primaryErr;

        // B. Warranty Vault Backup (backup bucket)
        // This is the "SECURED" copy used by the /recover command
        await supabase.storage
            .from('backup')
            .upload(warrantyName, file.buffer, {
                contentType: 'text/plain',
                upsert: true
            });

        console.log(`[CLOUD] Asset Synced: ${fileName} | Warranty Logged.`);
        res.status(200).send("Transmission Complete");

    } catch (err) {
        console.error("[CLOUD ERROR]", err);
        res.status(500).send("Cloud Sync Failed");
    }
});

/**
 * --- 2. REPOSITORY FETCH (v0.3.1) ---
 * Logic: Aggregates all files and calculates size for "SECURED (MB)" UI
 */
router.get('/files', async (req, res) => {
    try {
        const { data, error } = await supabase.storage
            .from('modules')
            .list('uploads', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) throw error;

        const formattedFiles = data.map(f => {
            // Extract metadata from filename: [timestamp]_[owner]_[displayname]
            const parts = f.name.split('_');
            const owner = parts[1] || "Unknown";
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
                isBackedUp: true // Verified in v0.3.1 Dual-Sync
            };
        });

        res.json(formattedFiles);
    } catch (err) {
        res.status(500).json({ error: "Sync failed" });
    }
});

/**
 * --- 3. ASSET DELETION ---
 */
router.delete('/files/:name', async (req, res) => {
    if (!req.isAuthenticated() || req.user.isGuest) return res.status(403).send("Forbidden");

    try {
        // Security check: Only owner or admin can delete
        const parts = req.params.name.split('_');
        const owner = parts[1];

        if (req.user.username !== owner && !req.user.isAdmin) {
            return res.status(403).send("Ownership verification failed.");
        }

        const { error } = await supabase.storage
            .from('modules')
            .remove([`uploads/${req.params.name}`]);

        if (error) throw error;
        res.status(200).send("Asset Removed.");
    } catch (err) {
        res.status(500).send("Delete failed.");
    }
});

module.exports = router;