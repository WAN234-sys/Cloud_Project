/** SCE v0.3.1 - CORE ENGINE **/
let currentUser = null;
let recoveryCheckInterval = null;
let titleClicks = 0; // v0.3.1 Dev Secret Counter

async function init() {
    console.log("CORE: Initiating v0.3.1 Identity Handshake...");
    setupTitleSecret(); // Activate dev name listener

    try {
        const res = await fetch('/api/auth/user');
        currentUser = await res.json();
        
        if (currentUser.authenticated) {
            // Unlock Main UI and hide Login Box
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('main-ui').style.display = 'block';
            
            // Activate Minibox Interface
            const trigger = document.getElementById('minibox-trigger');
            if(trigger) trigger.style.display = 'flex';

            renderProfile();
            
            // Global functions defined in client.js & terminal.js
            if (window.setupActionListeners) setupActionListeners(); 
            if (window.fetchFiles) fetchFiles();

            // v0.3.1 Notification State: Pulse dot if admin has tasks or user has key
            if (currentUser.newRestoreAvailable) {
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
            }

            // Start background detection for restores (Non-Admins only)
            if (!currentUser.isAdmin && !currentUser.isGuest) {
                startRecoveryPolling();
            }
            
        } else {
            // Unauthenticated state: setup TOC logic from client.js
            if (window.setupTOSListener) setupTOSListener();
        }
    } catch (err) {
        console.error("CORE: Handshake Protocol Failed", err);
    }
}

/**
 * RENDER PROFILE (v0.3.1 Update)
 * Implements: 
 * - Gold name for Admin
 * - Guest toggle (BACK TO LOGIN)
 * - Admin Badge
 */
function renderProfile() {
    const anchor = document.getElementById('profile-anchor');
    if (!anchor) return;

    // v0.3.1: Change logout text to "BACK TO LOGIN" for guests
    const logoutLabel = currentUser.isGuest ? "BACK TO LOGIN" : "LOGOUT";
    const userColor = currentUser.isAdmin ? 'var(--gold)' : 'white';

    anchor.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
            <div class="user-icon" style="color:var(--electric-green); border:1px solid #333; padding:6px 10px; border-radius:4px; background:#0d1117;">
                <i class="fas ${currentUser.isAdmin ? 'fa-user-shield' : (currentUser.isGuest ? 'fa-user-secret' : 'fa-code')}"></i>
            </div>
            <div>
                <div style="font-weight:bold; color:${userColor}">
                    ${currentUser.username} ${currentUser.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}
                </div>
                <a href="/api/auth/logout" style="font-size:10px; color:var(--text-muted); text-decoration:none;">${logoutLabel}</a>
            </div>
        </div>`;
}

/**
 * DEVELOPER SECRET (v0.3.1)
 * Requirement: 5 clicks on SCE EXPLORER to show dev name
 */
function setupTitleSecret() {
    const title = document.getElementById('app-title');
    if (!title) return;

    title.onclick = () => {
        titleClicks++;
        if (titleClicks === 5) {
            alert("Developer: WAN234-sys");
            titleClicks = 0; // Reset counter
        }
    };
}

/**
 * RECOVERY POLLING (v0.3.1)
 * Background listener for the "Red Dot" and claim key modal
 */
function startRecoveryPolling() {
    if (recoveryCheckInterval) clearInterval(recoveryCheckInterval);

    recoveryCheckInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/user/check-recovery');
            const data = await res.json();

            if (data.ready) {
                // Trigger Red Dot pulse
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // Show claim modal (if defined in index.html)
                const popup = document.getElementById('claim-popup');
                if (popup && popup.style.display !== 'block') {
                    document.getElementById('claim-key-display').innerText = data.key;
                    popup.style.display = 'block';
                }
            }
        } catch (e) {
            console.warn("POLLING: Recovery sync lost.");
        }
    }, 15000); // Poll every 15s to save bandwidth
}

// Execute Handshake
init();