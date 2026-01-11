const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Memory storage is best for small .c files to ensure fast transmission
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

const ADMIN_USER = "WAN234-sys";

// --- 1. LIST FILES ---
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
            const originalName = parts.slice(2).join('_');
            const expectedBackup = `warranty_${owner}_${originalName}`;

            return {
                name: f.name,
                displayName: originalName,
                isBackedUp: backupSet.has(expectedBackup),
                url: `${process.env.SUPABASE_URL}/storage/v1/object/public/modules/uploads/${f.name}`,
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

// --- 2. UPLOAD PROJECT (FIXED FOR .C TRANSMISSION) ---
router.post('/upload', upload.single('cfile'), async (req, res) => {
    // 1. Check Auth
    if (!req.isAuthenticated() || req.user.isGuest) {
        return res.status(401).send('Write-access denied: Connect with GitHub for Warranty protection.');
    }

    // 2. Validate File Presence
    if (!req.file) {
        return res.status(400).send('Transmission failure: No file data received.');
    }
    
    const filename = req.file.originalname;
    const username = req.user.username;

    try {
        const { data: existingFiles } = await supabase.storage.from('modules').list('uploads');
        const isDuplicate = existingFiles.some(f => f.name.includes(`_${username}_${filename}`));

        if (isDuplicate) {
            return res.status(409).send(`Error: You already have a file named "${filename}"`);
        }

        const ts = Date.now();
        const primaryPath = `uploads/${ts}_${username}_${filename}`;
        const backupPath = `archives/warranty_${username}_${filename}`;

        /**
         * FIX: Explicitly set Content-Type
         * Supabase sometimes rejects .c files if the MIME type is 'application/octet-stream'
         * We force it to 'text/plain' so it's readable and accepted.
         */
        const uploadOptions = {
            contentType: 'text/plain',
            upsert: true
        };

        console.log(`Transmitting: ${filename} for ${username}...`);

        const uploadResults = await Promise.all([
            supabase.storage.from('modules').upload(primaryPath, req.file.buffer, uploadOptions),
            supabase.storage.from('backup').upload(backupPath, req.file.buffer, uploadOptions)
        ]);

        // Check for specific Supabase errors in the array
        const errors = uploadResults.filter(result => result.error);
        if (errors.length > 0) throw errors[0].error;

        res.status(200).send('Project Transmitted to Secure Cloud');
    } catch (e) { 
        console.error("Upload Error Details:", e);
        res.status(500).send("Transmission failed: " + (e.message || "Internal Storage Error")); 
    }
});

// --- 3. DELETE PROJECT ---
router.delete('/files/:name', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileName = req.params.name;
    const parts = fileName.split('_');
    const owner = parts[1];

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