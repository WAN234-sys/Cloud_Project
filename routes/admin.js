/** SCE v1.0.1 [BETA] - ADMIN ENGINE & BUCKET BRIDGE **/
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_USER = process.env.ADMIN_USERNAME || "WAN234-sys";

/**
 * --- 1. ADMIN RESTORE COMMAND ---
 * Handles the transfer from 'backup' to 'modules' and generates the Claim Key.
 */
router.post('/restore', async (req, res) => {
    // SECURITY HANDSHAKE: Strict Admin Check
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) {
        return res.status(403).json({ error: "Access Denied: Admin Clearance Required." });
    }

    const { username, filename } = req.body;
    
    if (!username || !filename) {
        return res.status(400).json({ error: "Missing parameters: username/filename." });
    }

    const sourcePath = `archives/warranty_${username}_${filename}`;
    const destPath = `restored/${username}/${Date.now()}_${filename}`;

    try {
        // STEP A: EXTRACTION
        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup')
            .download(sourcePath);

        if (dlErr || !blob) throw new Error(`Asset [${filename}] not found in Secure Vault.`);

        // STEP B: RECONSTITUTION
        const { error: ulErr } = await supabase.storage
            .from('modules')
            .upload(destPath, blob, { 
                contentType: 'application/octet-stream',
                upsert: true 
            });

        if (ulErr) throw ulErr;

        // STEP C: KEY GENERATION (Format: XXXX-XXXX)
        const key = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // STEP D: GLOBAL STATE SYNC (Updates Minibox/Handshake)
        global.recoveryData[username] = {
            filename: filename,
            key: key,
            ready: true,
            claimed: false,
            processedAt: new Date().toISOString(),
            vPath: destPath 
        };

        // STEP E: QUEUE UPDATE
        global.adminTickets = global.adminTickets.filter(t => t.username !== username);

        res.status(200).json({
            success: true,
            claimKey: key
        });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * --- 2. NOTIFICATION & TICKET PURGE ---
 * Fixes the "UNVERIFIED" bug by ensuring states are cleared across the system.
 */
router.post('/clear-notification', (req, res) => {
    const { key } = req.body;
    
    const owner = Object.keys(global.recoveryData).find(
        u => global.recoveryData[u].key === key
    );

    if (owner) {
        // Remove the data once verified to stop "UNVERIFIED" loops
        delete global.recoveryData[owner];
        global.adminTickets = global.adminTickets.filter(t => t.username !== owner);
        return res.status(200).json({ success: true });
    }

    res.status(404).json({ success: false });
});

/**
 * --- 3. ADMIN TICKET VIEW ---
 */
router.get('/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.username === ADMIN_USER) {
        res.json(global.adminTickets);
    } else {
        res.status(403).json([]); // Return empty array instead of string to prevent frontend bugs
    }
});

/**
 * --- 4. TICKET INTAKE (GUEST BLOCKED) ---
 * Strict lockdown: Guests cannot even trigger a ticket creation.
 */
router.post('/mail/send', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // GUEST LOCKDOWN
    if (req.user.isGuest || req.user.username === 'Guest') {
        return res.status(403).json({ error: "GUEST_INTERACTION_RESTRICTED" });
    }

    const { filename } = req.body;
    const username = req.user.username;

    // Prevent duplicate tickets
    const exists = global.adminTickets.find(t => t.username === username && t.filename === filename);
    if (exists) return res.status(400).json({ error: "TICKET_ALREADY_OPEN" });

    const ticket = {
        id: Date.now(),
        username: username,
        filename: filename,
        timestamp: new Date().toLocaleTimeString(),
        status: "pending_admin_action"
    };

    global.adminTickets.push(ticket);
    res.status(200).json({ success: true });
});

module.exports = router;