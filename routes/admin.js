const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_USER = "WAN234-sys";

/**
 * --- ADMIN RESTORE COMMAND ---
 * CMD: /Recovery [user] [file]
 * Logic: Pulls from 'backup/archives' and pushes to 'modules/uploads'
 */
router.post('/restore', async (req, res) => {
    // Strict Admin-Only Gate
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) {
        return res.status(403).send("ACCESS DENIED: Administrative Privileges Required.");
    }

    const { username, filename } = req.body;
    
    // File Paths
    const sourcePath = `archives/warranty_${username}_${filename}`;
    const destinationPath = `uploads/RESTORED_${Date.now()}_${username}_${filename}`;

    try {
        console.log(`[RESTORE INITIATED] Target: ${username} | File: ${filename}`);

        // 1. Download the blob from the Backup bucket
        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup')
            .download(sourcePath);

        if (dlErr || !blob) {
            throw new Error(`Archive Not Found: ${filename} is missing from the Warranty Vault.`);
        }

        // 2. Upload the blob back into the Primary (modules) bucket
        const { error: ulErr } = await supabase.storage
            .from('modules')
            .upload(destinationPath, blob);

        if (ulErr) throw ulErr;

        /**
         * 3. SIGNAL LOGIC
         * In a full production app, you'd update a database here.
         * For this beta, we attach a temporary flag to the session system 
         * if the user happens to be active, or log it for the next handshake.
         */
        console.log(`[ADMIN] Restoration Successful for ${username}. Asset live at: ${destinationPath}`);
        
        res.status(200).send(`Restored: ${filename} is now visible for ${username}`);
    } catch (e) {
        console.error(`[RESTORE ERROR]`, e.message);
        res.status(500).send(`Restoration Failed: ${e.message}`);
    }
});

/**
 * --- RECOVERY MAILBOX ---
 * Hidden Ticket Submission from the Triple-Click Shield
 */
router.post('/mail/send', async (req, res) => {
    const { username, filename } = req.body;
    
    // Server-side logging serves as the "Ticket System" for the Admin
    const timestamp = new Date().toISOString();
    
    console.log(`
    --- NEW RECOVERY TICKET ---
    USER: ${username}
    FILE: ${filename}
    TIME: ${timestamp}
    STATUS: PENDING ADMIN ACTION
    ---------------------------
    `);

    res.status(200).json({ 
        status: "logged", 
        message: "Ticket received by the Secure Repository Admin." 
    });
});

module.exports = router;