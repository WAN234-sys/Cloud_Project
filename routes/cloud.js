const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configure Multer for 5MB .c file limit
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const ADMIN_USER = "WAN234-sys";

/**
 * --- 1. LIST FILES (v0.2.11 Integrated) ---
 * Logic: Checks both 'modules' (Live) and 'backup' (Archives) buckets
 * Also flags files if they are part of a pending Claim Key
 */
router.get('/files', async (req, res) => {
    try {
        const [primaryRes, backupRes] = await Promise.all([
            supabase.storage.from('modules').list('uploads'),
            supabase.storage.from('backup').list('archives')
        ]);

        if (primaryRes.error) throw primaryRes.error;

        const backupSet = new Set(backupRes.data?.map(b => b.name) || []);
        const activeRecoveries = global.recoveryData || {};

        const files = primaryRes.data.map(f => {
            const parts = f.name.split('_');
            const owner = parts[1];
            
            // Reconstruct the original filename from the timestamped bucket name
            const originalName = parts.slice(2).join('_');
            const expectedBackup = `warranty_${owner}_${originalName}`;
            
            // v0.2.11: Check if the current user has a recovery notification for THIS file
            const recoveryInfo = activeRecoveries[owner];
            const isRecoveredAsset = recoveryInfo && 
                                   recoveryInfo.filename === originalName && 
                                   recoveryInfo.ready;

            return {
                name: f.name,
                displayName: originalName,
                owner: owner,
                isBackedUp: backupSet.has(expectedBackup),
                isRecovered: isRecoveredAsset, // Triggers Gold UI
                url: `${process.env.SUPABASE_URL}/storage/v1/object/public/modules/uploads/${f.name}`,
                canManage: (req.user?.username === ADMIN_USER) || 
                           (req.isAuthenticated() && owner === req.user.username)
            };
        });

        // Sort: Admin files first, then recovered assets, then chronological
        files.sort((a, b) => (b.isRecovered - a.isRecovered));

        res.json(files);
    } catch (e) { 
        console.error("SCE CLOUD ERROR:", e.message);
        res.status(200).json([]); 
    }
});

/**
 * --- 2. UPLOAD PROJECT ---
 * Dual-stream upload: Primary Cloud + Warranty Vault
 */
router.post('/upload', upload.single('cfile'), async (req, res) => {
    if (!req.isAuthenticated() || req.user.isGuest) {
        return res.status(401).send('Write-access denied: Connection required for Warranty.');
    }

    if (!req.file) {
        return res.status(400).send('Transmission failure: No data.');
    }
    
    const filename = req.file.originalname;
    const username = req.user.username;

    try {
        const { data: existingFiles } = await supabase.storage.from('modules').list('uploads');
        const isDuplicate = existingFiles.some(f => f.name.includes(`_${username}_${filename}`));

        if (isDuplicate) {
            return res.status(409).send(`Duplicate asset detected: ${filename}`);
        }

        const ts = Date.now();
        const primaryPath = `uploads/${ts}_${username}_${filename}`;
        const backupPath = `archives/warranty_${username}_${filename}`;

        const uploadOptions = {
            contentType: 'text/plain',
            upsert: true
        };

        // Execute Parallel Upload
        const uploadResults = await Promise.all([
            supabase.storage.from('modules').upload(primaryPath, req.file.buffer, uploadOptions),
            supabase.storage.from('backup').upload(backupPath, req.file.buffer, uploadOptions)
        ]);

        const errors = uploadResults.filter(result => result.error);
        if (errors.length > 0) throw errors[0].error;

        res.status(200).send('Transmission Complete: Asset Secured');
    } catch (e) { 
        console.error("UPLOAD FAIL:", e);
        res.status(500).send("Cloud Transmission Error"); 
    }
});

/**
 * --- 3. DELETE PROJECT ---
 * Only removes from primary 'modules' bucket. 
 * 'backup' bucket remains as a cold-storage archive for recovery.
 */
router.delete('/files/:name', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileName = req.params.name;
    const owner = fileName.split('_')[1];

    if (req.user.username !== owner && req.user.username !== ADMIN_USER) {
        return res.status(403).send("Unauthorized");
    }

    try {
        const { error } = await supabase.storage.from('modules').remove([`uploads/${fileName}`]);
        if (error) throw error;
        
        // v0.2.11: If user deletes a file that was just recovered, clear the recovery state
        if (global.recoveryData[owner]) {
            delete global.recoveryData[owner];
        }

        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

module.exports = router;