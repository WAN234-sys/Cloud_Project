/** SCE v1.0.4 - ADMIN ENGINE & BUCKET BRIDGE **/
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client (Using Service Role Key for Admin privileges)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ADMIN_USER = process.env.ADMIN_USERNAME || "WAN234-sys";

/**
 * --- 1. ADMIN RESTORE COMMAND (/recover) ---
 * Triggered by Admin Terminal: /recover [username]_[filename].c
 */
router.post('/restore', async (req, res) => {
    // SECURITY HANDSHAKE: Strict Admin Check
    if (!req.isAuthenticated() || req.user.username !== ADMIN_USER) {
        return res.status(403).json({ error: "ACCESS_DENIED: ADMIN_CLEARANCE_REQUIRED" });
    }

    const { username, filename } = req.body;
    
    if (!username || !filename) {
        return res.status(400).json({ error: "INVALID_PARAMETERS: USERNAME/FILENAME_MISSING" });
    }

    try {
        // STEP A: SEARCH ASSET IN BACKUP
        const sourcePath = `archives/warranty_${username}_${filename}`;
        
        const { data: blob, error: dlErr } = await supabase.storage
            .from('backup')
            .download(sourcePath);

        if (dlErr || !blob) throw new Error(`ASSET_[${filename}]_NOT_FOUND_IN_VAULT`);

        // STEP B: GENERATE 6-6-6-6 UPPERCASE KEY
        const rawKey = crypto.randomBytes(12).toString('hex').toUpperCase();
        const goldKey = `${rawKey.slice(0,6)}-${rawKey.slice(6,12)}-${rawKey.slice(12,18)}-${rawKey.slice(18,24)}`;

        // STEP C: UPDATE DATABASE & GLOBAL STATE (PENDING)
        // This makes the file visible as "PENDING" in the admin view and user minibox
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

        // STEP D: GLOBAL STATE SYNC (For Real-time UI Updates)
        global.recoveryData[username] = {
            filename: filename,
            key: goldKey,
            status: "PENDING_ADMIN_KEY",
            ready: true,
            processedAt: new Date().toISOString()
        };

        // STEP E: QUEUE CLEANUP
        global.adminTickets = global.adminTickets.filter(t => t.username !== username);

        // SUCCESS RESPONSE WITH SYSTEM NOTE
        res.status(200).json({ 
            success: true, 
            message: `SUCCESS: ASSET_LOCKED_IN_PENDING_STATE.
            RECOVERY_KEY: [${goldKey}]
            *** SYSTEM NOTE: PLEASE COPY THIS CODE AND SEND IT TO THE USER. THEY MUST ENTER IT IN THE MINIBOX TO RECOVER THE .C FILE. ***`
        });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message.toUpperCase() });
    }
});

/**
 * --- 2. ADMIN TICKET VIEW (Mailbox) ---
 */
router.get('/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.username === ADMIN_USER) {
        const sortedTickets = [...global.adminTickets].reverse();
        res.json(sortedTickets);
    } else {
        res.status(403).json([]); 
    }
});

/**
 * --- 3. TICKET INTAKE ---
 */
router.post('/mail/send', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.isGuest || req.user.username === 'Guest') {
        return res.status(403).json({ error: "GUEST_INTERACTION_RESTRICTED" });
    }

    const { filename } = req.body;
    const username = req.user.username;

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

module.exports = router;