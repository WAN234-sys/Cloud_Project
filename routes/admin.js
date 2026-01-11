const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_USER = "WAN234-sys";

// CMD: /Recovery [user] [file]
router.post('/restore', async (req, res) => {
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) return res.sendStatus(403);

    const { username, filename } = req.body;
    const source = `archives/warranty_${username}_${filename}`;
    const dest = `uploads/RESTORED_${Date.now()}_${username}_${filename}`;

    try {
        const { data: blob, error: dlErr } = await supabase.storage.from('backup').download(source);
        if (dlErr) throw new Error("File missing in Backup Cloud.");

        await supabase.storage.from('modules').upload(dest, blob);
        
        // Success: Log request for Frontend "Green Dot" notification
        console.log(`[ADMIN] Restored ${filename} for ${username} at ${new Date().toISOString()}`);
        res.status(200).send('Restoration Complete');
    } catch (e) { res.status(500).send(e.message); }
});

// Mailbox: Hidden Ticket Submission
router.post('/mail/send', async (req, res) => {
    const { username, filename } = req.body;
    // Log exact time in server logs for Admin monitoring
    console.log(`[MAILBOX] Recovery Request: ${username} | File: ${filename} | Time: ${new Date().toLocaleTimeString()}`);
    res.status(200).json({ status: "logged" });
});

module.exports = router;