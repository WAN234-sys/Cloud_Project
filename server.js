/** SCE v1.0.1 [BETA] - CORE SERVER ENGINE **/
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const path = require('path');

// Modular Route Imports
const authRoutes = require('./routes/auth');
const cloudRoutes = require('./routes/cloud');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * --- 1. GLOBAL STATE & MEMORY MANAGEMENT ---
 * High-speed volatile memory for Beta phase sync.
 */
global.adminTickets = []; 
global.recoveryData = {}; // Format: { username: { key: 'SCE-XXXX', filename: 'file.c', ready: bool, claimed: bool } }

/**
 * AUTO-CLEANUP PROTOCOL: v1.0.1
 * Purges expired recovery keys every 24 hours to ensure memory efficiency.
 */
setInterval(() => {
    const now = Date.now();
    const expiry = 24 * 60 * 60 * 1000; 
    let purgedCount = 0;

    Object.keys(global.recoveryData).forEach(user => {
        const timestamp = new Date(global.recoveryData[user].processedAt).getTime();
        if (now - timestamp > expiry) {
            delete global.recoveryData[user];
            purgedCount++;
        }
    });
    if (purgedCount > 0) console.log(`[SYS] Cleanup: ${purgedCount} expired keys purged.`);
}, 86400000);

/**
 * --- 2. SECURITY & MIDDLEWARE ---
 */
app.set('trust proxy', 1); // Crucial for Render/HTTPS session persistence
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); 

/**
 * --- 3. SESSION MANAGEMENT ---
 */
app.use(session({
    secret: process.env.SESSION_SECRET || 'sce_neural_link_2026',
    resave: false, 
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24H Session
    } 
}));

/**
 * --- 4. AUTHENTICATION ENGINE ---
 */
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
        ? "https://shared-code-explorer.onrender.com/api/auth/github/callback"
        : "http://localhost:3000/api/auth/github/callback"
}, (accessToken, refreshToken, profile, done) => {
    const user = {
        username: profile.username,
        avatar: profile._json.avatar_url,
        isAdmin: profile.username === (process.env.ADMIN_USERNAME || "WAN234-sys"),
        isGuest: false,
        authenticated: true
    };
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

/**
 * --- 5. MINIBOX & RECOVERY HANDSHAKE API ---
 */

// [USER] Submit Recovery Ticket
app.post('/api/admin/mail/send', (req, res) => {
    if (!req.isAuthenticated() || req.user.isGuest) return res.sendStatus(401);
    const { username, filename } = req.body;
    
    const ticket = {
        id: Date.now(),
        username: username || req.user.username,
        filename,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    global.adminTickets.push(ticket);
    console.log(`[TICKET] Request Logged: ${ticket.username} -> ${filename}`);
    res.json({ success: true });
});

// [ADMIN] View Ticket Queue
app.get('/api/admin/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
        res.json(global.adminTickets);
    } else {
        res.status(403).send("CLEARANCE_DENIED");
    }
});

// [ADMIN] Reconstitute Asset (Issue Key)
app.post('/api/admin/restore', (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    const { username, filename } = req.body;
    const claimKey = `SCE-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
    
    global.recoveryData[username] = {
        filename,
        key: claimKey,
        ready: true,
        claimed: false,
        processedAt: new Date().toISOString()
    };

    global.adminTickets = global.adminTickets.filter(t => t.username !== username);
    console.log(`[VAULT] Recovery Key Generated for ${username}`);
    res.json({ success: true, claimKey });
});

// [USER] Handshake: Check for pending assets
app.get('/api/user/check-recovery', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const data = global.recoveryData[req.user.username];
    if (data && !data.claimed) {
        res.json({ ready: true, key: data.key, filename: data.filename });
    } else {
        res.json({ ready: false });
    }
});

// [USER] Final Claim Handshake
app.post('/api/user/verify-key', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { key } = req.body;
    const user = req.user.username;

    if (global.recoveryData[user] && global.recoveryData[user].key === key) {
        global.recoveryData[user].claimed = true;
        // Logic for moving file from backup bucket to active bucket would trigger here
        console.log(`[VERIFIED] ${user} successfully claimed asset.`);
        res.status(200).send("Verified");
    } else {
        res.status(403).send("INVALID_KEY");
    }
});

/**
 * --- 6. ROUTING HIERARCHY ---
 */
app.use('/api/auth', authRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/admin', adminRoutes);

// SPA Redirect: All routes not caught by API serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * --- 7. STARTUP ---
 */
app.listen(PORT, () => {
    console.log(`
    =================================================
    SCE v1.0.1 [BETA] CORE ONLINE
    NODE_ENV  : ${process.env.NODE_ENV || 'development'}
    PORT      : ${PORT}
    ADMIN     : ${process.env.ADMIN_USERNAME || "WAN234-sys"}
    =================================================
    `);
});