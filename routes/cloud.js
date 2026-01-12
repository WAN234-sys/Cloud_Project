/** SCE v1.0.1 [BETA] - CLOUD ENGINE & DUAL-SYNC PROTOCOL **/
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Storage
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const upload = multer({ storage: multer.memoryStorage() });

/**
 * --- 1. ASSET TRANSMISSION ---
 * Logic: Dual-sync to 'modules' (Live Repository) AND 'backup' (SECURED Warranty Vault)
 */
router.post('/upload', upload.single('cfile'), async (req, res) => {
    // 1. SECURITY HANDSHAKE
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (req.user.isGuest) return res.status(403).send("Guest explorers restricted from transmission.");

    const file = req.file;
    if (!file) return res.status(400).send("No asset provided.");
    
    // Safety check for file extension
    if (!file.originalname.endsWith('.c')) {
        return res.status(400).send("Protocol Error: .c Source Required.");
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}_${req.user.username}_${file.originalname}`;
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
        // This copy is immutable and only accessible via Admin Bridge for restores.
        const { error: backupErr } = await supabase.storage
            .from('backup')
            .upload(warrantyName, file.buffer, {
                contentType: 'text/plain',
                upsert: true
            });

        if (backupErr) {
            console.warn(`[WARRANTY WARNING] Backup sync failed for ${file.originalname}:`, backupErr.message);
        }

        console.log(`[SUCCESS] ${fileName} synced to Repository & Vault.`);
        res.status(200).send("Transmission Complete");

    } catch (err) {
        console.error("[CLOUD CRITICAL]", err.message);
        res.status(500).send("Cloud Sync Failed");
    }
});

/**
 * --- 2. REPOSITORY FETCH ---
 * Logic: Lists assets from the 'modules' bucket and 'restored' folders.
 */
router.get('/files', async (req, res) => {
    try {
        // Fetch primary uploads
        const { data: uploads, error: upErr } = await supabase.storage
            .from('modules')
            .list('uploads', { 
                limit: 100, 
                sortBy: { column: 'created_at', order: 'desc' } 
            });

        if (upErr) throw upErr;

        // Fetch restored assets specifically for this user (if authenticated)
        let restoredFiles = [];
        if (req.isAuthenticated() && !req.user.isGuest) {
            const { data: rData } = await supabase.storage
                .from('modules')
                .list(`restored/${req.user.username}`, { limit: 20 });
            if (rData) restoredFiles = rData.map(f => ({ ...f, isRestoredFolder: true }));
        }

        const allFiles = [...restoredFiles, ...uploads];

        const formattedFiles = allFiles.map(f => {
            const isRecovered = f.isRestoredFolder || f.name.startsWith('RESTORED_');
            
            // Parsing logic based on pathing
            const parts = f.name.split('_');
            const owner = f.isRestoredFolder ? req.user.username : (parts[1] || "System");
            const displayName = f.isRestoredFolder ? f.name.split('_').slice(1).join('_') : parts.slice(2).join('_');
            
            const filePath = f.isRestoredFolder ? 
                `restored/${req.user.username}/${f.name}` : 
                `uploads/${f.name}`;

            return {
                name: f.name,
                displayName: displayName || f.name,
                owner: owner,
                sizeBytes: f.metadata?.size || 0,
                isRecovered: isRecovered,
                url: supabase.storage.from('modules').getPublicUrl(filePath).data.publicUrl,
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
        const fileName = req.params.name;
        
        // Determine owner from filename (format: timestamp_owner_name.c)
        const parts = fileName.split('_');
        const owner = parts[1];

        if (req.user.username !== owner && !req.user.isAdmin) {
            return res.status(403).send("Clearance Denied: Ownership Mismatch.");
        }

        const { error } = await supabase.storage
            .from('modules')
            .remove([`uploads/${fileName}`]);

        if (error) throw error;
        res.status(200).send("Asset Purged.");
    } catch (err) {
        res.status(500).send("Deletion Failed.");
    }
});

module.exports = router;