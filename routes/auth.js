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
        req.user.isAdmin = (req.user.username === ADMIN_HANDLE);
        req.user.isGuest = false;
        
        // Success: Redirect to system dashboard
        res.redirect('/dashboard');
    }
);

/**
 * --- 2. GUEST ACCESS ENGINE ---
 * Renamed from 'Guest Explorer' to 'Guest'.
 * Includes limited scope permissions.
 */
router.get('/guest', (req, res) => {
    const guestID = Math.floor(1000 + Math.random() * 9000);
    const guestUser = {
        username: `Guest_${guestID}`,
        avatar: '/assets/default-guest.png', // Placeholder for 32px PFP
        isGuest: true,
        isAdmin: false,
        permissions: 'READ_ONLY'
    };

    req.login(guestUser, (err) => {
        if (err) return res.redirect('/');
        res.redirect('/dashboard');
    });
});

/**
 * --- 3. IDENTITY STATUS HANDSHAKE ---
 * Used by frontend to:
 * 1. Set PFP to 32px
 * 2. Hide Shield from Admin
 * 3. Trigger Green Notification Dot
 */
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            user: {
                username: req.user.username,
                avatar: req.user.avatar,
                isAdmin: req.user.isAdmin,
                isGuest: req.user.isGuest
            },
            // Checks if Admin has processed a /recover command for this user
            recoveryReady: global.recoveryData ? !!global.recoveryData[req.user.username]?.ready : false
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
        req.session.destroy();
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;