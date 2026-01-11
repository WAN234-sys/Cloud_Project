/** SCE v0.3.41 [BETA] - ADMIN ENGINE & BUCKET BRIDGE **/
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_USER = process.env.ADMIN_USERNAME || "WAN234-sys";

/**
 * --- ADMIN RESTORE COMMAND (v0.3.41 BETA) ---
 * Sequence: Download from 'backup' -> Upload to 'modules' -> Issue Key
 */
router.post('/restore', async (req, res) => {
    // 1. SECURITY HANDSHAKE
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) {
        console.warn(`[SECURITY] Unauthorized restore attempt by: ${req.user?.username}`);
        return res.status(403).json({ error: "Access Denied: Admin Clearance Required." });
    }

    const { username, filename } = req.body;
    
    if (!username || !filename) {
        return res.status(400).json({ error: "Missing parameters: username/filename." });
    }

    // Path definitions for Bucket Bridge
    const sourcePath = `archives/warranty_${username}_${filename}`;
    const destPath = `restored/${username}/${Date.now()}_${filename}`;

    try {
        console.log(`[BRIDGE] Initiating Bucket Bridge for ${username}`);

        // 2. EXTRACTION (Isolated Backup Bucket)
        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup')
            .download(sourcePath);

        if (dlErr || !blob) {
            throw new Error(`Asset [${filename}] not found in Secure Vault.`);
        }

        // 3. RECONSTITUTION (Production Modules Bucket)
        const { error: ulErr } = await supabase.storage
            .from('modules')
            .upload(destPath, blob, { 
                contentType: 'text/plain',
                upsert: true 
            });

        if (ulErr) throw ulErr;

        // 4. v0.3.41 KEY GENERATION (High Entropy)
        // Generates a key like: "A1B2-C3D4"
        const key = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // 5. GLOBAL STATE SYNC (For User Minibox Polling)
        global.recoveryData[username] = {
            filename: filename,
            key: key,
            ready: true,
            claimed: false,
            processedAt: new Date().toISOString(),
            vPath: destPath // Store path for final verification move
        };

        // 6. QUEUE PURGE
        global.adminTickets = global.adminTickets.filter(t => t.username !== username);

        console.log(`[BRIDGE SUCCESS] Restore Key issued to ${username}: ${key}`);

        res.status(200).json({
            success: true,
            message: `Asset Bridge Complete.`,
            claimKey: key
        });

    } catch (e) {
        console.error(`[BRIDGE ERROR]`, e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * --- ADMIN TICKET VIEW ---
 */
router.get('/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.username === ADMIN_USER) {
        res.json(global.adminTickets);
    } else {
        res.status(403).send("Clearance Denied.");
    }
});

/**
 * --- TICKET INTAKE HANDLER ---
 */
router.post('/mail/send', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Explicit block for Guest users
    if (req.user.isGuest) {
        return res.status(403).send("Guest accounts restricted from Warranty use.");
    }

    const { username, filename } = req.body;
    
    const ticket = {
        id: Date.now(),
        username: username || req.user.username,
        filename: filename,
        timestamp: new Date().toLocaleTimeString(),
        status: "pending_admin_action"
    };

    global.adminTickets.push(ticket);
    console.log(`[TICKET LOG] New request from ${ticket.username}`);
    res.status(200).json({ success: true });
});

module.exports = router;