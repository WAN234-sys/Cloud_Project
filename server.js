require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const { createClient } = require('@supabase/supabase-client');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. DATABASE INITIALIZATION (Malaysia-Vault Bridge)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Memory Cache for active recovery tickets
global.recoveryData = new Map(); 

// 2. MIDDLEWARE STACK
// Link the routes you've updated/created
app.use('/api/admin', require('./routes/admin'));
app.use('/api/vault', require('./routes/vault'));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'sce-vault-link-000',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

/** * 3. IDENTITY HANDSHAKE (GitHub OAuth)
 * logic: Synchronizes GitHub identity with the Malaysia-Vault.
 */
app.get('/auth/github', (req, res) => {
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_ID}&scope=user:email`);
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

        // Map session data
        req.session.user = {
            id: userRes.data.id,
            username: userRes.data.login,
            avatar: userRes.data.avatar_url,
            isAdmin: userRes.data.login === 'WAN234' // Admin identity
        };
        res.redirect('/');
    } catch (err) {
        res.redirect('/?auth=failed');
    }
});

/**
 * 4. RECOVERY PROTOCOL API
 * Logic: Handles the movement of assets from Restricted Vault -> Community Archive.
 */

// Admin: Execute Reconstitution
app.post('/api/admin/restore', async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).json({ error: 'UNAUTHORIZED' });

    const { username, filename } = req.body;
    const claimKey = `SCE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Store key in global memory for Minibox verification
    global.recoveryData.set(claimKey, { username, filename });

    res.json({ success: true, claimKey });
});

// User: Claim Reconstituted Asset
app.post('/api/user/verify-key', async (req, res) => {
    const { key } = req.body;
    const recovery = global.recoveryData.get(key);

    if (recovery && recovery.username === req.session.user.username) {
        try {
            // Logic: Mark the file as 'public' in Supabase to reconstitute it
            await supabase
                .from('vault_assets')
                .update({ status: 'reconstituted', visibility: 'public' })
                .match({ filename: recovery.filename, owner: recovery.username });

            global.recoveryData.delete(key); // Clear used key
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'VAULT_SYNC_ERROR' });
        }
    } else {
        res.status(401).json({ error: 'INVALID_CLAIM_KEY' });
    }
});

/**
 * 5. SYSTEM STATUS & EXIT
 */
app.get('/api/session', (req, res) => {
    if (!req.session.user) {
        return res.json({ isGuest: true, user: { username: 'GUEST', avatar: '/default-pfp.png' } });
    }
    
    // Check if a recovery key exists for this user
    const hasKey = Array.from(global.recoveryData.values()).some(v => v.username === req.session.user.username);
    
    res.json({ 
        isGuest: false, 
        user: req.session.user,
        recoveryReady: hasKey 
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => console.log(`[SCE_SYSTEM] Bridge Active on Port ${PORT}`));