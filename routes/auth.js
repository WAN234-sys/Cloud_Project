/** SCE v1.0.1 [BETA] - AUTHENTICATION & IDENTITY ENGINE **/
const express = require('express');
const router = express.Router();
const passport = require('passport');

/**
 * --- 1. IDENTITY HANDSHAKE (v1.0.1) ---
 * FIXED: Path changed to '/status' to match 'user.js' fetch('/api/auth/status')
 */
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        const username = req.user.username;
        const isAdmin = req.user.isAdmin || username === (process.env.ADMIN_USERNAME || "WAN234-sys");
        const isGuest = req.user.isGuest || username.startsWith('Guest_');
        
        // Check for pending recovery keys
        const recoveryInfo = (!isGuest && global.recoveryData) ? global.recoveryData[username] : null;
        const hasPendingRecovery = recoveryInfo && recoveryInfo.ready && !recoveryInfo.claimed;

        // Admin Alert: Check queue
        const adminHasTickets = isAdmin && global.adminTickets && global.adminTickets.length > 0;

        res.json({
            authenticated: true,
            username: username,
            avatar: req.user.avatar || "https://github.com/identicons/user.png",
            isAdmin: isAdmin,
            isGuest: isGuest,
            newRestoreAvailable: !!(hasPendingRecovery || adminHasTickets),
            aiContext: isGuest ? "RESTRICTED_EXPLORER" : "AUTHENTICATED_USER"
        });
    } else {
        res.json({ 
            authenticated: false, 
            isGuest: true,
            username: "Guest",
            aiContext: "GATEWAY_ANONYMOUS" 
        });
    }
});

/**
 * --- 2. GITHUB OAUTH ---
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        req.session.save((err) => {
            if (err) return res.redirect('/');
            res.redirect('/');
        });
    }
);

/**
 * --- 3. GUEST EXPLORER PROTOCOL ---
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
        if (err) return res.redirect('/');
        req.session.save(() => res.redirect('/'));
    });
});

/**
 * --- 4. SECURE LOGOUT (FIXED) ---
 * Ensures the session is killed on the server and the cookie is cleared on the client.
 */
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error("[AUTH] Logout Error:", err);
        
        // 1. Destroy the server-side session
        req.session.destroy((err) => {
            if (err) console.error("[AUTH] Session Destruct Error:", err);
            
            // 2. Clear the browser cookie
            res.clearCookie('connect.sid', { path: '/' }); 
            
            // 3. Force a full redirect to clean frontend state
            res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.redirect('/');
        });
    });
});

module.exports = router;