/** SCE v0.3.41 [BETA] - IDENTITY & HANDSHAKE ENGINE **/

// Global User State
window.currentUser = {
    username: 'Guest',
    avatar: null,
    isAdmin: false,
    isGuest: true,
    authenticated: false,
    newRestoreAvailable: false
};

/**
 * 1. IDENTITY INITIALIZATION
 * Sequence: Fetches session data from /api/auth/status
 */
async function initUserSession() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();

        if (data.authenticated) {
            window.currentUser = {
                ...data,
                newRestoreAvailable: false
            };
            
            // Proceed to UI Load
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('main-ui').style.display = 'block';
            document.getElementById('minibox-trigger').style.display = 'flex';
            
            renderProfile();
            
            // Start the Recovery Handshake Loop
            startRecoveryHandshake();
            
            // Initial File Sync
            if (window.fetchFiles) window.fetchFiles();
        }
    } catch (err) {
        console.warn("SCE: No active session detected. Awaiting Gateway input.");
    }
}

/**
 * 2. PROFILE RENDERING
 * Requirement: Display identity in the anchor zone
 */
function renderProfile() {
    const anchor = document.getElementById('profile-anchor');
    if (!anchor) return;

    anchor.innerHTML = `
        <div class="user-profile-card" style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding:10px; background:var(--card-bg); border-radius:12px; border:1px solid var(--gh-border);">
            <img src="${window.currentUser.avatar || 'https://via.placeholder.com/32'}" style="width:32px; height:32px; border-radius:50%; border:1px solid var(--electric-green);">
            <div>
                <div style="font-size:12px; font-weight:700;">${window.currentUser.username} ${window.currentUser.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}</div>
                <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">
                    ${window.currentUser.isGuest ? 'Volatile Session' : 'Secured via TAW'}
                </div>
            </div>
            <a href="/api/auth/logout" style="margin-left:auto; font-size:14px; color:var(--danger-red); opacity:0.6;"><i class="fas fa-power-off"></i></a>
        </div>
    `;
}

/**
 * 3. RECOVERY HANDSHAKE (v0.3.41 New)
 * Logic: Periodically checks if an Admin has issued a Claim Key
 */
async function startRecoveryHandshake() {
    if (window.currentUser.isGuest) return; // Guests have no recovery rights

    const check = async () => {
        try {
            const res = await fetch('/api/user/check-recovery');
            const data = await res.json();

            if (data.ready) {
                window.currentUser.newRestoreAvailable = true;
                
                // Alert the user via Minibox Notification
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // If Minibox is open, re-render to show the key input
                if (document.getElementById('minibox-ui').style.display === 'block') {
                    if (window.renderMiniboxContent) window.renderMiniboxContent();
                }
                
                console.log(`[VAULT] New Recovery Key detected for ${data.filename}`);
            }
        } catch (e) {
            console.error("Handshake Error: Link unstable.");
        }
    };

    // Initial check + every 30 seconds
    check();
    setInterval(check, 30000);
}

// Auto-boot sequence
document.addEventListener('DOMContentLoaded', initUserSession);