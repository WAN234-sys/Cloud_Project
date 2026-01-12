/** SCE v1.0.1 [BETA] - ADMIN ENGINE & BUCKET BRIDGE **/
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client using environment variables from Render
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_USER = process.env.ADMIN_USERNAME || "WAN234-sys";

/**
 * --- 1. ADMIN RESTORE COMMAND (v1.0.1) ---
 * Sequence: Download from 'backup' bucket -> Upload to 'modules' bucket -> Issue Claim Key
 */
router.post('/restore', async (req, res) => {
    // SECURITY HANDSHAKE: Ensure only the designated Admin can trigger a restore
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) {
        console.warn(`[SECURITY] Unauthorized restore attempt by: ${req.user?.username}`);
        return res.status(403).json({ error: "Access Denied: Admin Clearance Required." });
    }

    const { username, filename } = req.body;
    
    if (!username || !filename) {
        return res.status(400).json({ error: "Missing parameters: username/filename." });
    }

    // Path definitions for the transfer bridge
    const sourcePath = `archives/warranty_${username}_${filename}`;
    const destPath = `restored/${username}/${Date.now()}_${filename}`;

    try {
        console.log(`[BRIDGE] Initiating Bucket Bridge for ${username}`);

        // STEP A: EXTRACTION (Download from Secure Backup Bucket)
        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup')
            .download(sourcePath);

        if (dlErr || !blob) {
            throw new Error(`Asset [${filename}] not found in Secure Vault.`);
        }

        // STEP B: RECONSTITUTION (Upload to Production Modules Bucket)
        const { error: ulErr } = await supabase.storage
            .from('modules')
            .upload(destPath, blob, { 
                contentType: 'text/plain',
                upsert: true 
            });

        if (ulErr) throw ulErr;

        // STEP C: KEY GENERATION (High Entropy format: XXXX-XXXX)
        const generateKey = () => `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const key = generateKey();

        // STEP D: GLOBAL STATE SYNC (Triggers the User's "Minibox" notification)
        global.recoveryData[username] = {
            filename: filename,
            key: key,
            ready: true,
            claimed: false,
            processedAt: new Date().toISOString(),
            vPath: destPath 
        };

        // STEP E: QUEUE PURGE (Remove from Admin's pending tickets)
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
 * --- 2. NOTIFICATION PURGE (v1.0.1 NEW) ---
 * Triggered by the client-side verify.js when a user confirms the claim.
 * This clears the Admin's notification red dot automatically.
 */
router.post('/clear-notification', (req, res) => {
    const { key } = req.body;
    
    // Cross-reference the key to find the file owner in the recovery object
    const owner = Object.keys(global.recoveryData).find(
        u => global.recoveryData[u].key === key
    );

    if (owner) {
        // Purge the specific admin ticket
        global.adminTickets = global.adminTickets.filter(t => t.username !== owner);
        console.log(`[PURGE] Admin notification for ${owner} cleared via verify.js handshake.`);
        return res.status(200).json({ success: true });
    }

    res.status(404).json({ success: false, message: "No active ticket found for this key." });
});

/**
 * --- 3. ADMIN TICKET VIEW ---
 * Returns the list of pending recovery requests for the Admin Terminal.
 */
router.get('/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.username === ADMIN_USER) {
        res.json(global.adminTickets);
    } else {
        res.status(403).send("Clearance Denied.");
    }
});

/**
 * --- 4. TICKET INTAKE HANDLER ---
 * Triggered when a standard user requests a file warranty/restore.
 */
router.post('/mail/send', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Guest accounts cannot request file restores
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