const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const upload = multer({ storage: multer.memoryStorage() });
const ADMIN_USER = "WAN234-sys";

// --- 1. LIST FILES ---
// Fetches from 'modules' (Live) and checks 'backup' (Warranty)
router.get('/files', async (req, res) => {
    try {
        const [primaryRes, backupRes] = await Promise.all([
            supabase.storage.from('modules').list('uploads'),
            supabase.storage.from('backup').list('archives')
        ]);

        if (primaryRes.error) throw primaryRes.error;

        const backupSet = new Set(backupRes.data?.map(b => b.name) || []);

        const files = primaryRes.data.map(f => {
            const parts = f.name.split('_');
            const owner = parts[1];
            // Reconstruct original name in case it contains underscores
            const originalName = parts.slice(2).join('_');
            const expectedBackup = `warranty_${owner}_${originalName}`;

            return {
                name: f.name,
                displayName: originalName,
                isBackedUp: backupSet.has(expectedBackup),
                url: `${process.env.SUPABASE_URL}/storage/v1/object/public/modules/uploads/${f.name}`,
                // Permission Logic: Admins can manage everything, users can manage their own
                canManage: (req.user?.username === ADMIN_USER) || 
                           (req.isAuthenticated() && owner === req.user.username)
            };
        });
        res.json(files);
    } catch (e) { 
        console.error("Cloud Fetch Error:", e.message);
        res.status(200).json([]); 
    }
});

// --- 2. UPLOAD PROJECT ---
// Implements Dual-Bucket Mirroring
router.post('/upload', upload.single('cfile'), async (req, res) => {
    // Block Unauthenticated or Guest access (Read-only)
    if (!req.isAuthenticated() || req.user.isGuest) {
        return res.status(401).send('Write-access denied: Connect with GitHub for Warranty protection.');
    }
    
    const filename = req.file.originalname;
    const username = req.user.username;

    try {
        // Safety: Prevent duplicate filenames for the same user
        const { data: existingFiles } = await supabase.storage.from('modules').list('uploads');
        const isDuplicate = existingFiles.some(f => f.name.includes(`_${username}_${filename}`));

        if (isDuplicate) {
            return res.status(409).send(`Error: You already have a file named "${filename}"`);
        }

        const ts = Date.now();
        const primaryPath = `uploads/${ts}_${username}_${filename}`;
        const backupPath = `archives/warranty_${username}_${filename}`;

        // Dual-bucket write: Primary and Backup
        await Promise.all([
            supabase.storage.from('modules').upload(primaryPath, req.file.buffer),
            supabase.storage.from('backup').upload(backupPath, req.file.buffer, { upsert: true })
        ]);

        res.status(200).send('Project Transmitted to Secure Cloud');
    } catch (e) { 
        console.error("Upload Error:", e.message);
        res.status(500).send("Transmission failed: " + e.message); 
    }
});

// --- 3. DELETE PROJECT ---
// Removes from Primary bucket only; Backup (Warranty) remains untouched
router.delete('/files/:name', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileName = req.params.name;
    const parts = fileName.split('_');
    const owner = parts[1];

    // Security check: Only the owner or Admin can delete
    if (req.user.username !== owner && req.user.username !== ADMIN_USER) {
        return res.status(403).send("Unauthorized: Cannot delete secondary user assets.");
    }

    try {
        const { error } = await supabase.storage.from('modules').remove([`uploads/${fileName}`]);
        if (error) throw error;
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

module.exports = router;