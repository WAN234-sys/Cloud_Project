require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const path = require('path');

// NOTE: Ensure these route files exist or are updated to v0.2.11 logic
const authRoutes = require('./routes/auth');
const cloudRoutes = require('./routes/cloud');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. GLOBAL RECOVERY STATE (v0.2.11) ---
// Temporary in-memory storage for the beta session
global.adminTickets = []; 
global.recoveryData = {}; 

// --- 2. PROXY TRUST ---
app.set('trust proxy', 1);

// --- 3. ESSENTIAL MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// --- 4. SESSION CONFIGURATION ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'sce_beta_secret',
    resave: true,
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 
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
    const user = {
        username: profile.username,
        avatar: profile._json.avatar_url,
        isAdmin: profile.username === "WAN234-sys"
    };
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- 7. MINIBOX & RECOVERY API (v0.2.11 INTEGRATION) ---

// [USER] Submit Ticket: Triggered by minibox.js -> submitRecovery()
app.post('/api/admin/mail/send', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { username, filename } = req.body;
    
    const ticket = {
        id: Date.now(),
        username: username || req.user.username,
        filename,
        timestamp: new Date().toLocaleTimeString(),
        status: 'pending'
    };
    
    global.adminTickets.push(ticket);
    console.log(`[MINIBOX] Recovery Ticket Queued: ${ticket.username} -> ${filename}`);
    res.json({ success: true });
});

// [ADMIN] Fetch Tickets: Triggered by minibox.js -> renderMiniboxContent()
app.get('/api/admin/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
        res.json(global.adminTickets);
    } else {
        res.status(403).send("Forbidden: Administrative Access Required");
    }
});

// [ADMIN] Issue Recovery: Triggered by terminal.js -> /recover command
app.post('/api/admin/restore', (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    const { username, filename } = req.body;
    const claimKey = `SCE-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
    
    global.recoveryData[username] = {
        filename,
        key: claimKey,
        ready: true,
        claimed: false,
        processedAt: new Date().toLocaleTimeString()
    };

    // Auto-clear ticket from queue once processed
    global.adminTickets = global.adminTickets.filter(t => t.username !== username);
    
    console.log(`[ADMIN] Recovery Protocol Executed for ${username}. Key: ${claimKey}`);
    res.json({ success: true, claimKey });
});

// [USER] Polling Check: Triggered by minibox.js -> startRecoveryPolling()
app.get('/api/user/check-recovery', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const data = global.recoveryData[req.user.username];
    if (data && !data.claimed) {
        res.json({ ready: true, key: data.key });
    } else {
        res.json({ ready: false });
    }
});

// --- 8. CONNECT MODULAR ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/admin', adminRoutes);

// --- 9. FALLBACK ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 10. SERVER START ---
app.listen(PORT, () => {
    console.log(`
    =================================================
    CORE ENGINE : SCE v0.2.11 [BETA]
    PORT        : ${PORT}
    ADMIN_UID   : WAN234-sys
    LIFECYCLE   : Handshake Listeners Active
    =================================================
    `);
});