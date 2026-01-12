/** SCE v1.0.1 [BETA] - CLOUD STORAGE ENGINE **/
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// Configure Multer for memory storage (for buffer uploads)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * --- 1. FETCH ARCHIVE ---
 * Purpose: Retrieves files and tags them for the 'Your Archive' vs 'Community' UI.
 */
router.get('/files', async (req, res) => {
    try {
        // Fetch from the production 'modules' bucket
        const { data, error } = await supabase.storage.from('modules').list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
        });

        if (error) throw error;

        // Map files with owner metadata (stored in file names or metadata)
        const formattedFiles = data.map(file => {
            const isRecovered = file.name.includes('restored_');
            const owner = file.metadata?.owner || "System"; 
            
            return {
                name: file.name,
                displayName: file.name.split('_').pop(), // Clean name for SC EXPLORER UI
                sizeBytes: file.metadata?.size || 0,
                owner: owner,
                isRecovered: isRecovered,
                url: supabase.storage.from('modules').getPublicUrl(file.name).data.publicUrl,
                canManage: req.isAuthenticated() && (req.user.username === owner || req.user.isAdmin)
            };
        });

        res.json(formattedFiles);
    } catch (err) {
        console.error("[CLOUD] Sync Error:", err.message);
        res.status(500).json({ error: "FAILED_TO_SYNC_ARCHIVE" });
    }
});

/**
 * --- 2. FILE UPLOAD (FIXED) ---
 * Purpose: Handles Drag & Drop from client.js. Blocked for Guests.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    // GUEST LOCKDOWN: Server-side enforcement
    if (!req.isAuthenticated() || req.user.isGuest) {
        return res.status(403).json({ error: "GUEST_UPLOAD_RESTRICTED" });
    }

    if (!req.file) return res.status(400).json({ error: "NO_FILE_DETECTED" });

    const file = req.file;
    const fileName = `${req.user.username}_${Date.now()}_${file.originalname}`;

    try {
        const { data, error } = await supabase.storage
            .from('modules')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
                duplex: 'half'
            });

        if (error) throw error;

        console.log(`[CLOUD] Asset Uploaded: ${fileName} by ${req.user.username}`);
        res.status(200).json({ success: true, fileName: fileName });
    } catch (err) {
        console.error("[CLOUD] Upload Failure:", err.message);
        res.status(500).json({ error: "UPLOAD_HANDSHAKE_FAILED" });
    }
});

/**
 * --- 3. ASSET DELETION ---
 */
router.delete('/delete/:name', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileName = req.params.name;
    
    // Only owner or admin can delete
    if (!fileName.startsWith(req.user.username) && !req.user.isAdmin) {
        return res.status(403).json({ error: "DELETION_UNAUTHORIZED" });
    }

    try {
        const { error } = await supabase.storage.from('modules').remove([fileName]);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "DELETE_FAILED" });
    }
});

module.exports = router;