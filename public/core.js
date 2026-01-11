/** SCE v0.2.11 - CORE ENGINE **/
let currentUser = null;
let recoveryCheckInterval = null;

async function init() {
    console.log("CORE: Initiating Identity Handshake...");
    try {
        const res = await fetch('/api/auth/user');
        currentUser = await res.json();
        
        if (currentUser.authenticated) {
            // Unlock Main UI
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('main-ui').style.display = 'block';
            
            // Activate Global Triggers
            const trigger = document.getElementById('minibox-trigger');
            if(trigger) trigger.style.display = 'flex';

            renderProfile();
            setupActionListeners(); // Defined in client.js
            fetchFiles();           // Defined in terminal.js

            // Initial Notif Check
            if (currentUser.newRestoreAvailable) {
                document.getElementById('notif-dot').style.display = 'block';
            }

            // Start background detection for non-admins
            if (!currentUser.isAdmin) startRecoveryPolling();
            
        } else {
            setupTOSListener(); // Defined in client.js
        }
    } catch (err) {
        console.error("CORE: Handshake Failed", err);
    }
}

function renderProfile() {
    const anchor = document.getElementById('profile-anchor');
    if (!anchor) return;
    anchor.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
            <div class="user-icon" style="color:var(--electric-green); border:1px solid #333; padding:6px 10px; border-radius:4px; background:#0d1117;">
                <i class="fas ${currentUser.isAdmin ? 'fa-user-shield' : 'fa-code'}"></i>
            </div>
            <div>
                <div style="font-weight:bold; color:${currentUser.isAdmin ? 'var(--gold)' : 'white'}">
                    ${currentUser.username} ${currentUser.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}
                </div>
                <a href="/api/auth/logout" style="font-size:10px; color:var(--text-muted); text-decoration:none;">LOGOUT</a>
            </div>
        </div>`;
}