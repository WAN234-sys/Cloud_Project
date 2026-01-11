require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const path = require('path');

// 1. Initialize App & Constants
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Import Modular Routes
const authRoutes = require('./routes/auth');
const cloudRoutes = require('./routes/cloud');
const adminRoutes = require('./routes/admin');

// 3. Essential Middleware
app.use(express.json());

// Points to your new split HTML/CSS/JS folder
app.use(express.static(path.join(__dirname, 'public'))); 

// 4. Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'sce_beta_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // true if on Render (HTTPS)
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    } 
}));

// 5. Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// 6. GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    // Ensure this matches your GitHub Developer Settings exactly
    callbackURL: "https://shared-code-explorer.onrender.com/api/auth/github/callback" 
}, (accessToken, refreshToken, profile, done) => {
    // Identity Mapping: Logic stays inside the callback
    const user = {
        username: profile.username,
        avatar: profile._json.avatar_url,
        isAdmin: profile.username === "WAN234-sys"
    };
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// 7. Connect Modular Routes
// These must match the fetch() calls in your client.js
app.use('/api/auth', authRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/admin', adminRoutes);

// 8. Fallback: Serve index.html for any unknown routes (SPA Style)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 9. Server Initialization
app.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    SCE v0.2.1 [BETA] CORE ACTIVE
    PORT: ${PORT}
    MODE: ${process.env.NODE_ENV || 'development'}
    STATUS: ENCRYPTED & SECURE
    -------------------------------------------
    `);
});