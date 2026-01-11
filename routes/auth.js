const express = require('express');
const router = express.Router();
const passport = require('passport');

/**
 * --- 1. IDENTITY HANDSHAKE (v0.2.11) ---
 * Used by core.js -> initHandshake() to establish user state
 */
router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        const username = req.user.username;
        const isAdmin = req.user.isAdmin || username === "WAN234-sys";
        
        // v0.2.11 GLOBAL STATE CHECK
        // Check if there is a claim key waiting for this specific user
        const recoveryInfo = global.recoveryData ? global.recoveryData[username] : null;
        const hasPendingRecovery = recoveryInfo && recoveryInfo.ready && !recoveryInfo.claimed;

        // Check if Admin needs to see a notification for new incoming tickets
        const adminHasTickets = isAdmin && global.adminTickets && global.adminTickets.length > 0;

        res.json({
            authenticated: true,
            username: username,
            avatar: req.user.avatar,
            isAdmin: isAdmin,
            isGuest: req.user.isGuest || false,
            // TRIGGERS FRONTEND NOTIFICATIONS (Red Dot / Glow)
            newRestoreAvailable: hasPendingRecovery || adminHasTickets
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
        // Force session save to prevent handshake race conditions
        req.session.save((err) => {
            if (err) {
                console.error("SCE AUTH ERROR: Session Sync Failed", err);
                return res.redirect('/');
            }
            res.redirect('/');
        });
    }
);

/**
 * --- 3. GUEST EXPLORER LOGIC ---
 * Creates a temporary session for read-only access
 */
router.get('/guest', (req, res) => {
    const guestProfile = {
        username: `Explorer_${Math.floor(Math.random() * 9000) + 1000}`,
        avatar: "https://github.com/identicons/guest.png",
        isAdmin: false,
        isGuest: true
    };

    req.login(guestProfile, (err) => {
        if (err) {
            console.error("SCE AUTH ERROR: Guest Login Failure", err);
            return res.redirect('/');
        }
        req.session.save(() => {
            res.redirect('/');
        });
    });
});

/**
 * --- 4. TERMINATE SESSION ---
 */
router.get('/logout', (req, res) => {
    // Note: v0.2.11 does not clear global.recoveryData on logout 
    // This allows keys to persist if a user logs out and back in.
    req.logout((err) => {
        if (err) console.error("Logout error:", err);
        req.session.destroy((err) => {
            if (err) console.error("Session destruction error:", err);
            res.clearCookie('connect.sid'); 
            res.redirect('/');
        });
    });
});

module.exports = router;