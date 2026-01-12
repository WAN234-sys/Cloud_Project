/** SCE v1.0.1 [BETA] - AUTHENTICATION & IDENTITY ENGINE **/
const express = require('express');
const router = express.Router();
const passport = require('passport');

/**
 * --- 1. IDENTITY HANDSHAKE (v1.0.1) ---
 * Synchronizes Frontend/Server Global States.
 * Enhanced with NoA AI Intervention flags for autonomous guidance.
 */
router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        const username = req.user.username;
        const isAdmin = req.user.isAdmin || username === (process.env.ADMIN_USERNAME || "WAN234-sys");
        const isGuest = req.user.isGuest || false;
        
        // v1.0.1 BETA: Check for pending recovery keys in the global state
        const recoveryInfo = (!isGuest && global.recoveryData) ? global.recoveryData[username] : null;
        const hasPendingRecovery = recoveryInfo && recoveryInfo.ready && !recoveryInfo.claimed;

        // Admin Alert: Check if there are new tickets in the queue for the Admin Terminal
        const adminHasTickets = isAdmin && global.adminTickets && global.adminTickets.length > 0;

        res.json({
            authenticated: true,
            username: username,
            avatar: req.user.avatar || "https://github.com/identicons/user.png",
            isAdmin: isAdmin,
            isGuest: isGuest,
            // Logic: High-priority flag triggers the red notification dot for both Users and Admins
            newRestoreAvailable: !!(hasPendingRecovery || adminHasTickets),
            // NoA Context: Feeds the AI specialized state info to change its dialogue behavior
            aiContext: isGuest ? "RESTRICTED_EXPLORER" : "AUTHENTICATED_USER"
        });
    } else {
        // NoA uses 'GATEWAY_ANONYMOUS' to proactively offer login assistance via the UI
        res.json({ 
            authenticated: false, 
            aiContext: "GATEWAY_ANONYMOUS" 
        });
    }
});

/**
 * --- 2. GITHUB OAUTH ---
 * Standard GitHub authentication scope.
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

/**
 * GITHUB CALLBACK
 * Handles successful login and forces session persistence before redirecting.
 */
router.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        // v1.0.1 FIX: Force session commit to prevent 'authenticated: false' on fast page loads
        req.session.save((err) => {
            if (err) {
                console.error("[v1.0.1 AUTH] GitHub Sync Fail:", err);
                return res.redirect('/');
            }
            console.log(`[v1.0.1 AUTH] Neural Link established for: ${req.user.username}`);
            res.redirect('/');
        });
    }
);

/**
 * --- 3. GUEST EXPLORER PROTOCOL ---
 * Assigns a volatile ID for read-only access to the repository.
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
            console.error("[v1.0.1 AUTH] Guest Init Error:", err);
            return res.redirect('/');
        }
        req.session.save(() => {
            console.log(`[v1.0.1 AUTH] Volatile Session Created: ${guestProfile.username}`);
            res.redirect('/');
        });
    });
});

/**
 * --- 4. SECURE LOGOUT ---
 * Purges local session, destroys server-side session, and clears browser cookies.
 */
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error("[v1.0.1 AUTH] Logout Error:", err);
        
        req.session.destroy((err) => {
            if (err) console.error("[v1.0.1 AUTH] Session Destruct Error:", err);
            
            // Explicitly clear the connection cookie
            res.clearCookie('connect.sid', { path: '/' }); 
            console.log("[v1.0.1 AUTH] Local Session Purged. Gateway Closed.");
            res.redirect('/');
        });
    });
});

module.exports = router;