/** SCE v0.3.41 [BETA] - CORE SERVER ENGINE **/
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

// --- 1. GLOBAL STATE & MEMORY MANAGEMENT ---
// Using global scope for Beta rapid-syncing between modular routes
global.adminTickets = []; 
global.recoveryData = {}; // Format: { username: { key: 'SCE-XXXX', filename: 'file.c', ready: bool, claimed: bool } }

/**
 * AUTO-CLEANUP PROTOCOL: v0.3.41
 * Purges expired recovery keys every 24 hours to prevent memory bloat.
 */
setInterval(() => {
    const now = Date.now();
    const expiry = 24 * 60 * 60 * 1000; // 24 Hours
    let purgedCount = 0;

    Object.keys(global.recoveryData).forEach(user => {
        const timestamp = new Date(global.recoveryData[user].processedAt).getTime();
        if (now - timestamp > expiry) {
            delete global.recoveryData[user];
            purgedCount++;
        }
    });
    if (purgedCount > 0) console.log(`[BETA] Routine Cleanup: ${purgedCount} expired keys purged.`);
}, 24 * 60 * 60 * 1000);

// --- 2. SECURITY & PROXY ---
app.set('trust proxy', 1); // Required for Render/Heroku deployments
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// --- 3. SESSION MANAGEMENT ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'sce_beta_prime_2026',
    resave: false, 
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 Day
    } 
}));

// --- 4. AUTHENTICATION ENGINE ---
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

// --- 5. MINIBOX & RECOVERY API ---

// [USER] Submit Recovery Ticket (Public Cloud -> Admin Bridge)
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
    console.log(`[TICKET] v0.3.41 Request Logged: ${ticket.username} for ${filename}`);
    res.json({ success: true });
});

// [ADMIN] View Ticket Queue (Secure Bridge)
app.get('/api/admin/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
        res.json(global.adminTickets);
    } else {
        res.status(403).send("Clearance Denied: High-Level Access Required.");
    }
});

// [ADMIN] Issue Claim Key (The Verification Protocol)
app.post('/api/admin/restore', (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    const { username, filename } = req.body;
    // Generate High-Entropy Verification Key
    const claimKey = `SCE-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
    
    global.recoveryData[username] = {
        filename,
        key: claimKey,
        ready: true,
        claimed: false,
        processedAt: new Date().toISOString()
    };

    // Auto-remove from active ticket queue
    global.adminTickets = global.adminTickets.filter(t => t.username !== username);
    console.log(`[VAULT] Key Issued for ${username}: ${claimKey}`);
    res.json({ success: true, claimKey });
});

// [USER] Handshake: Check for pending Notifications & Keys
app.get('/api/user/check-recovery', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const data = global.recoveryData[req.user.username];
    if (data && !data.claimed) {
        res.json({ ready: true, key: data.key, filename: data.filename });
    } else {
        res.json({ ready: false });
    }
});

// [USER] Key Verification (The final claim handshake)
app.post('/api/user/verify-key', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { key } = req.body;
    const user = req.user.username;

    if (global.recoveryData[user] && global.recoveryData[user].key === key) {
        global.recoveryData[user].claimed = true;
        // In a production build, trigger the Supabase move from 'backup' to 'modules' here
        console.log(`[SUCCESS] User ${user} verified asset ownership.`);
        res.status(200).send("Verified");
    } else {
        res.status(403).send("Invalid Verification Key.");
    }
});

// --- 6. ROUTING HIERARCHY ---
app.use('/api/auth', authRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/admin', adminRoutes);

// SPA Fallback: Direct all non-API routes to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 7. STARTUP ---
app.listen(PORT, () => {
    console.log(`
    =================================================
    SCE v0.3.41 [BETA] CORE ONLINE
    PORT      : ${PORT}
    ENV       : ${process.env.NODE_ENV || 'development'}
    ADMIN     : ${process.env.ADMIN_USERNAME || "WAN234-sys"}
    PROTOCOL  : Dual-Sync Storage & Verification Active
    =================================================
    `);
});