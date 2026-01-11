require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. PROXY TRUST (CRITICAL FOR RENDER) ---
// Render uses a load balancer; this tells Express to trust the HTTPS headers it sends.
app.set('trust proxy', 1);

// --- 2. IMPORT MODULAR ROUTES ---
const authRoutes = require('./routes/auth');
const cloudRoutes = require('./routes/cloud');
const adminRoutes = require('./routes/admin');

// --- 3. ESSENTIAL MIDDLEWARE ---
app.use(express.json());
// Serves your index.html, style.css, and client.js from the /public folder
app.use(express.static(path.join(__dirname, 'public'))); 

// --- 4. SESSION CONFIGURATION (STABILIZED) ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'sce_beta_secret',
    resave: true,                // Ensures session is updated in the store
    saveUninitialized: false,    // Don't create sessions until something is stored
    proxy: true,                 // Tells session middleware to trust the reverse proxy
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // true if on Render (HTTPS)
        sameSite: 'lax',         // Allows cookie to be sent after GitHub redirect
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    } 
}));

// --- 5. PASSPORT INITIALIZATION ---
app.use(passport.initialize());
app.use(passport.session());

// --- 6. GITHUB OAUTH STRATEGY ---
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "https://shared-code-explorer.onrender.com/api/auth/github/callback" 
}, (accessToken, refreshToken, profile, done) => {
    // Identity Mapping
    const user = {
        username: profile.username,
        avatar: profile._json.avatar_url,
        isAdmin: profile.username === "WAN234-sys"
    };
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- 7. CONNECT MODULAR ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/admin', adminRoutes);

// --- 8. FALLBACK ---
// Supports Single Page Application behavior by serving index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 9. SERVER START ---
app.listen(PORT, () => {
    console.log(`
    -------------------------------------------------
    APP : SCE v0.2.1 [BETA] :ACTIVATED
    PORT: AUTO
    MODE: ${process.env.NODE_ENV || 'in development'}
    -------------------------------------------------
    `);
});