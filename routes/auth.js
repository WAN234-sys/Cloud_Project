const express = require('express');
const router = express.Router();
const passport = require('passport');

// --- 1. IDENTITY HANDSHAKE ---
// Called by init() in client.js to verify session status
router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            username: req.user.username,
            avatar: req.user.avatar,
            isAdmin: req.user.username === "WAN234-sys",
            // Triggers the Green Glow on the recovery shield if an admin restored a file
            newRestoreAvailable: req.user.newRestoreAvailable || false 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// --- 2. GITHUB AUTHENTICATION ---
// Redirects user to GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// Handles the response back from GitHub
router.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        // CRITICAL FIX: Manually save the session before redirecting.
        // This ensures the "Login Loop" is broken on high-latency hosts like Render.
        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.redirect('/');
            }
            res.redirect('/');
        });
    }
);

// --- 3. GUEST LOGIC ---
// Provides read-only access without a GitHub account
router.get('/guest', (req, res) => {
    const guestProfile = {
        username: "Guest_Explorer",
        avatar: "https://github.com/identicons/guest.png",
        isAdmin: false,
        isGuest: true
    };

    req.login(guestProfile, (err) => {
        if (err) {
            console.error("Guest login error:", err);
            return res.redirect('/');
        }
        // Ensure guest session is saved before redirect
        req.session.save(() => {
            res.redirect('/');
        });
    });
});

// --- 4. LOGOUT ---
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error("Logout error:", err);
        req.session.destroy((err) => {
            if (err) console.error("Session destruction error:", err);
            res.clearCookie('connect.sid'); // Clears the browser's session cookie
            res.redirect('/');
        });
    });
});

module.exports = router;