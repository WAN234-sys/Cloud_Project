const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_USER = "WAN234-sys";

/**
 * --- ADMIN RESTORE COMMAND (v0.2.11) ---
 * Logic: Downloads from 'backup' bucket -> Uploads to 'modules' bucket
 * Triggered by: terminal.js -> /recover [user] [file]
 */
router.post('/restore', async (req, res) => {
    // 1. Authorization & Protocol Check
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) {
        return res.status(403).send("ACCESS DENIED: Unauthorized Terminal Command.");
    }

    const { username, filename } = req.body;
    
    if (!username || !filename) {
        return res.status(400).send("ERROR: Missing parameters (User or Filename).");
    }

    // Path definitions matching your cloud structure
    const sourcePath = `archives/warranty_${username}_${filename}`;
    const destinationPath = `uploads/RESTORED_${Date.now()}_${username}_${filename}`;

    try {
        console.log(`[RECOVERY] Protocol Alpha initiated for ${username}...`);

        // 2. Data Retrieval from Warranty Vault (backup bucket)
        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup')
            .download(sourcePath);

        if (dlErr || !blob) {
            throw new Error(`Asset not found in Warranty Vault.`);
        }

        // 3. Asset Restoration to Primary Cloud (modules bucket)
        const { error: ulErr } = await supabase.storage
            .from('modules')
            .upload(destinationPath, blob, { 
                contentType: 'text/plain',
                upsert: true 
            });

        if (ulErr) throw ulErr;

        // 4. GENERATE CLAIM KEY & UPDATE STATE
        // Creates a key like "ABCD-1234"
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const claimKey = `${part1}-${part2}`;

        // Update global state so minibox.js polling finds it
        global.recoveryData[username] = {
            filename: filename,
            key: claimKey,
            ready: true,
            claimed: false,
            timestamp: new Date().toLocaleTimeString()
        };

        // Clear the ticket from the global queue (Handled)
        global.adminTickets = global.adminTickets.filter(t => t.username !== username);

        console.log(`[RECOVERY SUCCESS] Key ${claimKey} issued to ${username}.`);

        // Return JSON to satisfy terminal.js output
        res.status(200).json({
            message: `Restoration Complete.`,
            claimKey: claimKey
        });

    } catch (e) {
        console.error(`[ADMIN ERROR]`, e.message);
        res.status(500).json({ error: e.message });
    }
});

/**
 * --- TICKET FETCH (v0.2.11) ---
 * Provides the list for the Admin Minibox view
 */
router.get('/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.username === ADMIN_USER) {
        res.json(global.adminTickets);
    } else {
        res.status(403).send("Unauthorized");
    }
});

/**
 * --- INCOMING MAIL HANDLER ---
 * Receives tickets from User Minibox
 */
router.post('/mail/send', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { username, filename } = req.body;
    
    const ticket = {
        id: Date.now(),
        username: username || req.user.username,
        filename: filename,
        timestamp: new Date().toLocaleTimeString(),
        status: "urgent"
    };

    global.adminTickets.push(ticket);
    res.status(200).json({ success: true, message: "Ticket logged." });
});

module.exports = router;