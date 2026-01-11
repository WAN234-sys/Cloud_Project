const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_USER = "WAN234-sys";

/**
 * --- ADMIN RESTORE COMMAND (v0.3.1) ---
 * Logic: Downloads from 'backup' (Warranty Vault) -> Restores to 'modules' (Primary)
 * Triggered by: terminal.js -> /recover [username]_[filename].c
 */
router.post('/restore', async (req, res) => {
    // 1. STRICTOR AUTHORIZATION
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) {
        console.warn(`[SECURITY] Unauthorized restore attempt by: ${req.user?.username || 'Guest'}`);
        return res.status(403).send("ACCESS DENIED: Administrative Clearance Required.");
    }

    const { username, filename } = req.body;
    
    // Validate Input
    if (!username || !filename) {
        return res.status(400).send("ERROR: Missing parameters (User/File). Check syntax.");
    }

    // Path definitions for Supabase structure
    const sourcePath = `archives/warranty_${username}_${filename}`;
    const destinationPath = `uploads/RESTORED_${Date.now()}_${username}_${filename}`;

    try {
        console.log(`[v0.3.1 RECOVERY] Initiating restore for ${username} -> ${filename}`);

        // 2. DATA RETRIEVAL (From Backup Bucket)
        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup')
            .download(sourcePath);

        if (dlErr || !blob) {
            console.error(`[RECOVERY ERROR] File not found: ${sourcePath}`);
            throw new Error(`Asset [${filename}] not found in Warranty Vault.`);
        }

        // 3. ASSET RESTORATION (To Primary Bucket)
        const { error: ulErr } = await supabase.storage
            .from('modules')
            .upload(destinationPath, blob, { 
                contentType: 'text/plain',
                upsert: true 
            });

        if (ulErr) throw ulErr;

        // 4. GENERATE v0.3.1 CLAIM KEY
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const claimKey = `${part1}-${part2}`;

        // Update global state for User Polling (v0.3.1 Memory Sync)
        global.recoveryData[username] = {
            filename: filename,
            key: claimKey,
            ready: true,
            claimed: false,
            processedAt: new Date().toISOString() // Required for server.js cleanup task
        };

        // Auto-remove the handled ticket from the Admin Queue
        global.adminTickets = global.adminTickets.filter(t => t.username !== username);

        console.log(`[PROTOCOL SUCCESS] Recovery Key ${claimKey} assigned to ${username}.`);

        // Return JSON to terminal.js
        res.status(200).json({
            success: true,
            message: `Restoration Complete.`,
            claimKey: claimKey
        });

    } catch (e) {
        console.error(`[ADMIN ERROR]`, e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * --- TICKET FETCH (v0.3.1) ---
 * Provides the current queue for the Admin Minibox view
 */
router.get('/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.username === ADMIN_USER) {
        res.json(global.adminTickets);
    } else {
        res.status(403).send("Forbidden");
    }
});

/**
 * --- INCOMING MAIL HANDLER ---
 * Receives tickets from the User Minibox
 */
router.post('/mail/send', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Block Guests from requesting recovery
    if (req.user.isGuest) {
        return res.status(403).send("Guests cannot access Warranty services.");
    }

    const { username, filename } = req.body;
    
    const ticket = {
        id: Date.now(),
        username: username || req.user.username,
        filename: filename,
        timestamp: new Date().toLocaleTimeString(),
        status: "pending"
    };

    global.adminTickets.push(ticket);
    console.log(`[TICKET LOGGED] User ${ticket.username} requested ${filename}`);
    res.status(200).json({ success: true, message: "Ticket added to queue." });
});

module.exports = router;