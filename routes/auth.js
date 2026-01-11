const express = require('express');
const router = express.Router();
const passport = require('passport');

// Identity Handshake
router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            username: req.user.username,
            avatar: req.user.avatar,
            isAdmin: req.user.username === "WAN234-sys",
            // This flag triggers the Green Glow on the shield
            newRestoreAvailable: req.user.newRestoreAvailable || false 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// GitHub Auth
router.get('/github', passport.authenticate('github'));

router.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => res.redirect('/')
);

// Guest Logic
router.get('/guest', (req, res) => {
    // Simulated guest session
    req.session.guest = true;
    res.redirect('/');
});

router.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

module.exports = router;