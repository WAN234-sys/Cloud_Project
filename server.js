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

// --- 1. GLOBAL STATE & CLEANUP (v0.3.1) ---
global.adminTickets = []; 
global.recoveryData = {}; 

/**
 * AUTO-CLEANUP TASK: Runs every 24 hours
 * Prevents memory leaks by clearing unclaimed recovery keys older than 24h
 */
setInterval(() => {
    const now = Date.now();
    const expiry = 24 * 60 * 60 * 1000;
    Object.keys(global.recoveryData).forEach(user => {
        if (now - new Date(global.recoveryData[user].processedAt).getTime() > expiry) {
            delete global.recoveryData[user];
        }
    });
    console.log(`[SYSTEM] v0.3.1 Routine Cleanup Executed.`);
}, 24 * 60 * 60 * 1000);

// --- 2. PROXY & SECURITY ---
app.set('trust proxy', 1);

// --- 3. MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// --- 4. SESSION MANAGEMENT ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'sce_v3_secret_prime',
    resave: false, // v0.3.1 Performance optimization
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 
    } 
}));

// --- 5. AUTH INITIALIZATION ---
app.use(passport.initialize());
app.use(passport.session());

// --- 6. GITHUB STRATEGY (v0.3.1 Production Callback) ---
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
        isAdmin: profile.username === "WAN234-sys"
    };
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- 7. RECOVERY & MINIBOX API ---

// [USER] Send Recovery Mail
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
    console.log(`[MINIBOX] v0.3.1 Incoming Ticket: ${ticket.username}`);
    res.json({ success: true });
});

// [ADMIN] Fetch Active Tickets
app.get('/api/admin/tickets', (req, res) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
        res.json(global.adminTickets);
    } else {
        res.status(403).send("Unauthorized Access Attempt");
    }
});

// [ADMIN] Execute Restore Protocol
app.post('/api/admin/restore', (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    const { username, filename } = req.body;
    const claimKey = `SCE-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
    
    global.recoveryData[username] = {
        filename,
        key: claimKey,
        ready: true,
        claimed: false,
        processedAt: new Date().toISOString() // Standardized ISO format
    };

    global.adminTickets = global.adminTickets.filter(t => t.username !== username);
    res.json({ success: true, claimKey });
});

// [USER] Check Status (Polling)
app.get('/api/user/check-recovery', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const data = global.recoveryData[req.user.username];
    if (data && !data.claimed) {
        res.json({ ready: true, key: data.key, filename: data.filename });
    } else {
        res.json({ ready: false });
    }
});

// --- 8. ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/admin', adminRoutes);

// --- 9. SPA FALLBACK ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 10. LIFECYCLE START ---
app.listen(PORT, () => {
    console.log(`
    =================================================
    CORE ENGINE : SCE v0.3.1 [STABLE]
    PORT        : ${PORT}
    ADMIN_UID   : WAN234-sys
    STATUS      : Memory Cleanup Protocol Active
    =================================================
    `);
});