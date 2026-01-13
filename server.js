require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport'); // REQUIRED by admin.txt
const GitHubStrategy = require('passport-github2').Strategy;
const { createClient } = require('@supabase/supabase-js');

// 1. SETUP MALAYSIA-VAULT CONNECTION
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("SCE_HANDSHAKE: Vault connection established.");
const app = express();
const PORT = process.env.PORT || 3000;

// 2. GLOBAL MEMORY (Required by terminal.txt)
global.recoveryData = new Map();
global.adminTickets = []; 

// 3. PASSPORT SECURITY CONFIGURATION
// This creates the 'req.user' object that vault.txt looks for
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
    // CRITICAL: Must match your Render URL exactly
    callbackURL: "https://YOUR-APP-NAME.onrender.com/auth/github/callback" 
  },
  function(accessToken, refreshToken, profile, done) {
    // Map GitHub Profile to SCE User Identity
    const user = {
        id: profile.id,
        username: profile.username,
        avatar: profile._json.avatar_url,
        // Checks if you are the Admin (WAN234)
        isAdmin: profile.username === process.env.ADMIN_USERNAME 
    };
    return done(null, user);
  }
));

// 4. MIDDLEWARE STACK
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'sce-vault-link-000',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set 'true' if on HTTPS (Render)
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
    }
}));

// INITIALIZE PASSPORT (Fixes the admin.txt crash)
app.use(passport.initialize());
app.use(passport.session());

// 5. ROUTE MOUNTING
app.use(express.static('public'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/vault', require('./routes/vault')); // Links to vault.txt

/**
 * 6. AUTHENTICATION ROUTES (Passport Implementation)
 */
// Trigger GitHub Login
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

// Handle Return from GitHub
app.get('/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: '/?auth=failed' }),
    (req, res) => {
        console.log(`[AUTH] Access Granted: ${req.user.username}`);
        res.redirect('/'); // Redirects to Dashboard
    }
);

// Identity Status Check (Used by user.txt line 529)
app.get('/api/auth/status', (req, res) => {
    if (req.isAuthenticated()) {
        // Check if this user has a pending recovery key
        const hasKey = Array.from(global.recoveryData.values())
                            .some(v => v.username === req.user.username);
        res.json({
            authenticated: true,
            username: req.user.username,
            avatar: req.user.avatar,
            isAdmin: req.user.isAdmin,
            recoveryReady: hasKey
        });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/api/auth/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

/**
 * 7. RECOVERY PROTOCOL (For verify.txt)
 */
app.post('/api/user/verify-key', async (req, res) => {
    const { key } = req.body;
    if (!req.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });

    const recovery = global.recoveryData.get(key);

    if (recovery && recovery.username === req.user.username) {
        try {
            // Update Database
            const { error } = await supabase
                .from('assets') 
                .update({ status: 'reconstituted', visibility: 'public' })
                .match({ name: recovery.filename, owner_username: recovery.username });

            if (error) throw error;

            // Clear Memory
            global.recoveryData.delete(key);
            global.adminTickets = global.adminTickets.filter(t => t.username !== req.user.username);
            
            res.json({ success: true, message: "ASSET_RESTORED" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'VAULT_SYNC_ERROR' });
        }
    } else {
        res.status(401).json({ error: 'INVALID_CLAIM_KEY' });
    }
});

app.listen(PORT, () => console.log(`[SCE_SYSTEM] Bridge Active on Port ${PORT}`));