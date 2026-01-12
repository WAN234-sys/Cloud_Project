require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. DATABASE INITIALIZATION
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 2. GLOBAL MEMORY (Recovery Tickets)
global.recoveryData = new Map(); 

// 3. CORE MIDDLEWARE STACK (ORDER IS VITAL)
app.use(express.json()); // 1st: Parse JSON
app.use(express.urlencoded({ extended: true })); // 2nd: Parse Form Data
app.use(session({        // 3rd: Establish Session
    secret: process.env.SESSION_SECRET || 'sce-vault-link-000',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// 4. ROUTE MOUNTING (Must come AFTER Session/JSON middleware)
// Assuming these files exist in your /routes folder
const adminRoutes = require('./routes/admin');
const vaultRoutes = require('./routes/vault');
app.use('/api/admin', adminRoutes);
app.use('/api/vault', vaultRoutes);

app.use(express.static('public'));

/**
 * 5. IDENTITY HANDSHAKE (GitHub OAuth)
 */

app.get('/auth/github', (req, res) => {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_ID}&scope=user:email`;
    res.redirect(url);
});

app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_ID,
            client_secret: process.env.GITHUB_SECRET,
            code
        }, { headers: { Accept: 'application/json' } });

        const userRes = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${tokenRes.data.access_token}` }
        });

        // Map session data securely
        req.session.user = {
            id: userRes.data.id,
            username: userRes.data.login,
            avatar: userRes.data.avatar_url,
            isAdmin: userRes.data.login === 'WAN234' 
        };
        
        req.session.save(() => { // Force save before redirect
            res.redirect('/');
        });
    } catch (err) {
        console.error("[AUTH_ERROR]", err.message);
        res.redirect('/?auth=failed');
    }
});

/**
 * 6. RECOVERY PROTOCOL (The 6-6-6-6 Logic)
 */
app.post('/api/user/verify-key', async (req, res) => {
    const { key } = req.body;
    if (!req.session.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });

    const recovery = global.recoveryData.get(key);

    if (recovery && recovery.username === req.session.user.username) {
        try {
            const { data, error } = await supabase
                .from('vault_assets')
                .update({ status: 'reconstituted', visibility: 'public' })
                .match({ filename: recovery.filename, owner: recovery.username });

            if (error) throw error;

            global.recoveryData.delete(key); 
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'VAULT_SYNC_ERROR' });
        }
    } else {
        res.status(401).json({ error: 'INVALID_CLAIM_KEY' });
    }
});

/**
 * 7. SESSION & SYSTEM DIAGNOSTIC
 */
app.get('/api/session', (req, res) => {
    if (!req.session.user) {
        return res.json({ isGuest: true, user: { username: 'GUEST', avatar: '/default-pfp.png' } });
    }
    
    // Check for pending keys
    const hasKey = Array.from(global.recoveryData.values())
                        .some(v => v.username === req.session.user.username);
    
    res.json({ 
        isGuest: false, 
        user: req.session.user,
        recoveryReady: hasKey 
    });
});

app.listen(PORT, () => console.log(`[SCE_SYSTEM] Bridge Active on Port ${PORT}`));