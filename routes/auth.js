/** SCE v0.3.41 [BETA] - AUTHENTICATION & IDENTITY ENGINE **/
const express = require('express');
const router = express.Router();
const passport = require('passport');

/**
 * --- 1. IDENTITY HANDSHAKE ---
 * Synchronizes the Frontend Global State with the Server Global State.
 * Controls the Red Notification Dot and Minibox visibility.
 */
router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        const username = req.user.username;
        const isAdmin = req.user.isAdmin || username === (process.env.ADMIN_USERNAME || "WAN234-sys");
        const isGuest = req.user.isGuest || false;
        
        // v0.3.41 BETA: Check for pending recovery keys
        const recoveryInfo = (!isGuest && global.recoveryData) ? global.recoveryData[username] : null;
        const hasPendingRecovery = recoveryInfo && recoveryInfo.ready && !recoveryInfo.claimed;

        // Admin Alert: Check if there are new tickets in the queue
        const adminHasTickets = isAdmin && global.adminTickets && global.adminTickets.length > 0;

        res.json({
            authenticated: true,
            username: username,
            avatar: req.user.avatar || "https://github.com/identicons/user.png",
            isAdmin: isAdmin,
            isGuest: isGuest,
            // Logic: High-priority flag triggers the red dot for both Users (Keys) and Admins (Tickets)
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
        // BETA FIX: Force session commit to prevent 'authenticated: false' on immediate refresh
        req.session.save((err) => {
            if (err) {
                console.error("[BETA AUTH] GitHub Sync Fail:", err);
                return res.redirect('/');
            }
            res.redirect('/');
        });
    }
);

/**
 * --- 3. GUEST EXPLORER PROTOCOL ---
 * Assigns a volatile ID for read-only access.
 */
router.get('/guest', (req, res) => {
    const guestProfile = {
        username: `Guest_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        avatar: "https://github.com/identicons/guest.png",
        isAdmin: false,
        isGuest: true,
        authenticated: true
    };

    req.login(guestProfile, (err) => {
        if (err) {
            console.error("[BETA AUTH] Guest Init Error:", err);
            return res.redirect('/');
        }
        req.session.save(() => {
            console.log(`[BETA AUTH] Volatile Session Created: ${guestProfile.username}`);
            res.redirect('/');
        });
    });
});

/**
 * --- 4. SECURE LOGOUT ---
 */
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error("[BETA AUTH] Logout Error:", err);
        
        req.session.destroy((err) => {
            if (err) console.error("[BETA AUTH] Session Destruct Error:", err);
            
            res.clearCookie('connect.sid', { path: '/' }); 
            console.log("[BETA AUTH] Local Session Purged.");
            res.redirect('/');
        });
    });
});

module.exports = router;