/** SCE v1.0.5 [STABLE] - ADMIN ENGINE & BUCKET BRIDGE **/
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// 1. INITIALIZE GLOBAL OBJECTS
global.recoveryData = global.recoveryData || {};
global.adminTickets = global.adminTickets || [];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ADMIN_USER = process.env.ADMIN_USERNAME || "WAN234-sys";

/**
 * --- 1. ADMIN RESTORE COMMAND (/recover) ---
 * Triggered by the Admin typing /recover in the terminal.
 */
router.post('/restore', async (req, res) => {
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) {
        return res.status(403).json({ error: "ACCESS_DENIED: ADMIN_CLEARANCE_REQUIRED" });
    }

    const { username, filename } = req.body;
    
    if (!username || !filename) {
        return res.status(400).json({ error: "INVALID_PARAMETERS" });
    }

    try {
        // STEP A: SEARCH ASSET
        const sourcePath = `archives/warranty_${username}_${filename}`;
        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup')
            .download(sourcePath);

        if (dlErr || !blob) throw new Error(`ASSET_[${filename}]_NOT_FOUND_IN_VAULT`);

        // STEP B: GENERATE 6-6-6-6 GOLD KEY
        const rawKey = crypto.randomBytes(12).toString('hex').toUpperCase();
        const goldKey = `${rawKey.slice(0,6)}-${rawKey.slice(6,12)}-${rawKey.slice(12,18)}-${rawKey.slice(18,24)}`;

        // STEP C: UPDATE DATABASE
        const { error: dbErr } = await supabase
            .from('assets')
            .update({ 
                status: 'PENDING_KEY', 
                recovery_key: goldKey,
                storage_layer: 'backup' 
            })
            .eq('owner_username', username)
            .eq('name', filename);

        if (dbErr) throw dbErr;

        // STEP D: GLOBAL STATE SYNC
        global.recoveryData[username] = {
            filename: filename,
            key: goldKey,
            status: "PENDING_ADMIN_KEY",
            ready: true,
            processedAt: new Date().toISOString()
        };

        // STEP E: QUEUE CLEANUP - Remove from Admin's "Incoming" view
        global.adminTickets = global.adminTickets.filter(t => !(t.username === username && t.filename === filename));

        res.status(200).json({ 
            success: true, 
            claimKey: goldKey, 
            message: `SUCCESS: ASSET_LOCKED_IN_PENDING_STATE.`
        });

    } catch (e) {
        console.error("ADMIN_RESTORE_CRASH:", e);
        res.status(500).json({ success: false, error: e.message.toUpperCase() });
    }
});

/**
 * --- 2. ADMIN TICKET VIEW ---
 */
router.get('/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.username === ADMIN_USER) {
        // Returns the queue of users waiting for a key
        const sortedTickets = [...(global.adminTickets || [])].reverse();
        res.json(sortedTickets);
    } else {
        res.status(403).json([]); 
    }
});

/**
 * --- 3. TICKET INTAKE ---
 * Triggered by the User clicking "Request Recovery" in their UI.
 */
router.post('/mail/send', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { filename } = req.body;
    const username = req.user.username;

    global.adminTickets = global.adminTickets || [];

    const exists = global.adminTickets.find(t => t.username === username && t.filename === filename);
    if (exists) return res.status(400).json({ error: "TICKET_ALREADY_OPEN" });

    global.adminTickets.push({
        id: Date.now(),
        username: username,
        filename: filename,
        timestamp: new Date().toISOString(),
        status: "PENDING_ADMIN_ACTION"
    });

    res.status(200).json({ success: true });
});

/**
 * --- 4. NEW: NOTIFICATION PURGE (Synchronization Route) ---
 * Triggered by verify.js when a user successfully inputs their key.
 */
router.post('/clear-notification', (req, res) => {
    const { key } = req.body;
    
    // Find the username associated with this key to purge state
    const entry = Object.entries(global.recoveryData).find(([user, data]) => data.key === key);
    
    if (entry) {
        const username = entry[0];
        delete global.recoveryData[username];
        
        // Final sweep of tickets just in case
        global.adminTickets = global.adminTickets.filter(t => t.username !== username);
        
        console.log(`[VAULT_SYNC] State purged for user: ${username}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "KEY_NOT_FOUND_IN_ACTIVE_STATE" });
    }
});

module.exports = router;