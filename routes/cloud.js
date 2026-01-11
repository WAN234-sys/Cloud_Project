const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const upload = multer({ storage: multer.memoryStorage() });
const ADMIN_USER = "WAN234-sys";

// List Files: Primary (modules) + check Backup (backup)
router.get('/files', async (req, res) => {
    try {
        const [primaryRes, backupRes] = await Promise.all([
            supabase.storage.from('modules').list('uploads'),
            supabase.storage.from('backup').list('archives')
        ]);

        const backupSet = new Set(backupRes.data?.map(b => b.name) || []);

        const files = primaryRes.data.map(f => {
            const parts = f.name.split('_');
            const owner = parts[1];
            const originalName = parts.slice(2).join('_');
            const expectedBackup = `warranty_${owner}_${originalName}`;

            return {
                name: f.name,
                displayName: originalName,
                isBackedUp: backupSet.has(expectedBackup),
                url: `${process.env.SUPABASE_URL}/storage/v1/object/public/modules/uploads/${f.name}`,
                canManage: (req.user?.username === ADMIN_USER) || (req.isAuthenticated() && owner === req.user.username)
            };
        });
        res.json(files);
    } catch (e) { res.status(200).json([]); }
});

// Upload: Per-User Unique Filename Safety
router.post('/upload', upload.single('cfile'), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send('Connect to have access');
    
    const filename = req.file.originalname;
    const username = req.user.username;

    // Safety: Check if THIS user already has this filename
    const { data: existingFiles } = await supabase.storage.from('modules').list('uploads');
    const isDuplicate = existingFiles.some(f => f.name.includes(`_${username}_${filename}`));

    if (isDuplicate) {
        return res.status(409).send(`Error: You already have a file named "${filename}"`);
    }

    const ts = Date.now();
    const primaryPath = `uploads/${ts}_${username}_${filename}`;
    const backupPath = `archives/warranty_${username}_${filename}`;

    try {
        await Promise.all([
            supabase.storage.from('modules').upload(primaryPath, req.file.buffer),
            supabase.storage.from('backup').upload(backupPath, req.file.buffer, { upsert: true })
        ]);
        res.status(200).send('Project Transmitted');
    } catch (e) { res.status(500).send(e.message); }
});

// Delete: Primary Only (Backup stays safe)
router.delete('/files/:name', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await supabase.storage.from('modules').remove([`uploads/${req.params.name}`]);
    res.sendStatus(200);
});

module.exports = router;