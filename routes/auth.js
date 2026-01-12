/** SCE v1.0.3 [BETA] - AUTHENTICATION & IDENTITY GATEWAY **/
const express = require('express');
const passport = require('passport');
const router = express.Router();

const ADMIN_HANDLE = process.env.ADMIN_USERNAME || "WAN234-sys";

/**
 * --- 1. GITHUB LOGIN FLOW ---
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        // Flag user role immediately upon handshake
        // Ensure isAdmin is persisted in the session
        req.user.isAdmin = (req.user.username === ADMIN_HANDLE);
        req.user.isGuest = false;
        
        res.redirect('/dashboard');
    }
);

/**
 * --- 2. GUEST ACCESS ENGINE ---
 */
router.get('/guest', (req, res) => {
    const guestID = Math.floor(1000 + Math.random() * 9000);
    const guestUser = {
        id: `guest_${guestID}`, // Added ID to satisfy Passport serialization
        username: `Guest_${guestID}`,
        avatar: '/assets/default-guest.png',
        isGuest: true,
        isAdmin: false,
        permissions: 'READ_ONLY'
    };

    req.login(guestUser, (err) => {
        if (err) {
            console.error("GUEST_LOGIN_ERR:", err);
            return res.redirect('/');
        }
        res.redirect('/dashboard');
    });
});

/**
 * --- 3. IDENTITY STATUS HANDSHAKE ---
 */
router.get('/status', (req, res) => {
    if (req.isAuthenticated() && req.user) {
        // Safe check for recovery data
        const isRecoveryReady = (global.recoveryData && 
                                global.recoveryData[req.user.username] && 
                                global.recoveryData[req.user.username].ready === true);

        res.json({
            authenticated: true,
            user: {
                username: req.user.username,
                avatar: req.user.avatar || '/assets/default-avatar.png',
                isAdmin: req.user.isAdmin || false,
                isGuest: req.user.isGuest || false
            },
            recoveryReady: isRecoveryReady
        });
    } else {
        res.json({ authenticated: false });
    }
});

/**
 * --- 4. TERMINATION ---
 */
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.sendStatus(500);
        // Clear session fully to prevent "Zombie Sessions"
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
});

module.exports = router;