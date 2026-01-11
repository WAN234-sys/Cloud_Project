const express = require('express');
const router = express.Router();
const passport = require('passport');

/**
 * --- 1. IDENTITY HANDSHAKE (v0.3.1) ---
 * Used by core.js -> init() to establish user state and UI triggers.
 */
router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        const username = req.user.username;
        const isAdmin = req.user.isAdmin || username === "WAN234-sys";
        const isGuest = req.user.isGuest || false;
        
        // v0.3.1 GLOBAL STATE SYNC
        // Check for pending recovery keys (Only relevant for non-guests)
        const recoveryInfo = (!isGuest && global.recoveryData) ? global.recoveryData[username] : null;
        const hasPendingRecovery = recoveryInfo && recoveryInfo.ready && !recoveryInfo.claimed;

        // Check if Admin needs to see a notification for new incoming tickets
        const adminHasTickets = isAdmin && global.adminTickets && global.adminTickets.length > 0;

        res.json({
            authenticated: true,
            username: username,
            avatar: req.user.avatar,
            isAdmin: isAdmin,
            isGuest: isGuest,
            // v0.3.1: High-priority trigger for the "Red Dot" notification
            newRestoreAvailable: !!(hasPendingRecovery || adminHasTickets)
        });
    } else {
        res.json({ authenticated: false });
    }
});

/**
 * --- 2. GITHUB OAUTH ---
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        // v0.3.1 Fix: Ensure session is fully committed to the store 
        // before the frontend attempts the core.js handshake.
        req.session.save((err) => {
            if (err) {
                console.error("[AUTH] v0.3.1 Session Sync Error:", err);
                return res.redirect('/');
            }
            res.redirect('/');
        });
    }
);

/**
 * --- 3. GUEST EXPLORER PROTOCOL ---
 * Implements the "View-Only" identity for restricted navigation.
 */
router.get('/guest', (req, res) => {
    const guestProfile = {
        username: `Guest_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        avatar: "https://github.com/identicons/guest.png",
        isAdmin: false,
        isGuest: true
    };

    req.login(guestProfile, (err) => {
        if (err) {
            console.error("[AUTH] Guest Initialization Failed:", err);
            return res.redirect('/');
        }
        req.session.save(() => {
            console.log(`[AUTH] Guest Explorer Session Created: ${guestProfile.username}`);
            res.redirect('/');
        });
    });
});

/**
 * --- 4. SESSION TERMINATION ---
 */
router.get('/logout', (req, res) => {
    // Note: v0.3.1 preserves global.recoveryData during logout.
    // The server.js 24-hour cleanup task handles the actual purging.
    req.logout((err) => {
        if (err) console.error("[AUTH] Logout Error:", err);
        
        req.session.destroy((err) => {
            if (err) console.error("[AUTH] Session Cleanup Error:", err);
            
            res.clearCookie('connect.sid', { path: '/' }); 
            console.log("[AUTH] v0.3.1 Session Terminated.");
            res.redirect('/');
        });
    });
});

module.exports = router;