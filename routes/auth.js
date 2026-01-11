const express = require('express');
const router = express.Router();
const passport = require('passport');

// --- 1. IDENTITY HANDSHAKE ---
// This endpoint is called by init() in client.js to check if the user is logged in.
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
// Redirects user to GitHub for authorization
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// Handles the response back from GitHub
router.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        // Successful login: sending user back to the main UI
        res.redirect('/');
    }
);

// --- 3. GUEST LOGIC ---
// Provides limited access without requiring a GitHub account
router.get('/guest', (req, res) => {
    // We create a "Virtual Profile" for the guest so req.isAuthenticated() becomes true
    const guestProfile = {
        username: "Guest_Explorer",
        avatar: "https://github.com/identicons/guest.png",
        isAdmin: false,
        isGuest: true
    };

    // Log the guest in manually using Passport
    req.login(guestProfile, (err) => {
        if (err) {
            console.error("Guest login error:", err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

// --- 4. LOGOUT ---
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error("Logout error:", err);
        req.session.destroy(() => {
            res.clearCookie('connect.sid'); // Clears the session cookie
            res.redirect('/');
        });
    });
});

module.exports = router;