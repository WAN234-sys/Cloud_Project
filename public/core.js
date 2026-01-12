/** SCE v1.0.1 [BETA] - CORE ENGINE & IDENTITY HANDSHAKE **/

let currentUser = null;
let recoveryCheckInterval = null;
let titleClicks = 0; 

/**
 * --- 1. BOOT SEQUENCE ---
 * FIXED: Updated fetch path to '/api/auth/status' to match synchronized auth.js.
 */
async function init() {
    console.log("%c[CORE] Initiating SC EXPLORER v1.0.1 Handshake...", "color: #3498db; font-weight: bold;");
    
    try {
        // Match the endpoint in routes/auth.js
        const res = await fetch('/api/auth/status');
        currentUser = await res.json();
        
        // Sync Global State for other scripts (NoA.js, client.js, terminal.js)
        window.currentUser = currentUser;

        if (currentUser.authenticated && !currentUser.isGuest) {
            handleAuthenticatedState();
        } else if (currentUser.isGuest) {
            handleGuestState();
        } else {
            handleAnonymousState();
        }

        applyBranding();
        setupTitleSecret(); 

    } catch (err) {
        console.error("[CORE CRITICAL] Handshake Protocol Failed:", err);
        handleAnonymousState();
    }
}

/**
 * --- 2. AUTHENTICATED STATE LOGIC ---
 */
function handleAuthenticatedState() {
    const authSection = document.getElementById('auth-section');
    const mainUI = document.getElementById('main-ui');
    
    if (authSection) authSection.style.display = 'none';
    if (mainUI) {
        mainUI.style.display = 'block';
        mainUI.style.filter = 'none';
        mainUI.style.pointerEvents = 'auto';
    }
    
    // Activate UI features
    const trigger = document.getElementById('minibox-trigger');
    if (trigger) trigger.style.display = 'flex';

    renderProfile();
    
    // Trigger file sync
    if (window.fetchFiles) window.fetchFiles();

    syncSystemNotifications();

    // Start Recovery Monitoring (Exclude Admins from polling own requests)
    if (!currentUser.isAdmin) {
        startRecoveryPolling();
    }
}

/**
 * --- 3. GUEST & ANONYMOUS LOCKDOWN ---
 * Implements the "guest cant interact anything" requirement.
 */
function handleGuestState() {
    console.log("[CORE] Guest Access: Restricted Mode Active.");
    renderProfile();
    
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
        mainUI.style.filter = 'blur(10px) grayscale(1)';
        mainUI.style.pointerEvents = 'none'; // Disable all clicks
    }

    // Show specialized login prompt if overlay exists
    const blocker = document.getElementById('guest-blocker');
    if (blocker) blocker.style.display = 'flex';
}

/**
 * --- 4. BRANDING SYNC ---
 */
function applyBranding() {
    // Update Master Title
    const title = document.getElementById('app-title') || document.querySelector('.main-header h1');
    if (title) {
        title.innerText = "SC EXPLORER";
        title.style.fontSize = "3.5rem"; // Large as requested
        title.style.letterSpacing = "10px";
    }

    // Update Archive Label
    const archiveLabel = document.getElementById('archive-title');
    if (archiveLabel) archiveLabel.innerText = "Your Archive";
}

/**
 * --- 5. NOTIFICATION & RECOVERY POLLING ---
 */
function syncSystemNotifications() {
    if (currentUser.newRestoreAvailable) {
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = 'block';
        
        const vBox = document.getElementById('verify-box');
        if (vBox && !currentUser.isAdmin) vBox.style.display = 'block';
        
        if (window.playNotificationSound) window.playNotificationSound();
    }
}

function startRecoveryPolling() {
    if (recoveryCheckInterval) clearInterval(recoveryCheckInterval);

    recoveryCheckInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();
            window.currentUser = data;

            if (data.newRestoreAvailable) {
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // Fetch specific recovery details
                const recRes = await fetch('/api/user/check-recovery');
                const recData = await recRes.json();

                if (recData.ready && !recData.claimed) {
                    triggerClaimUI(recData.key);
                }
            }
        } catch (e) {
            console.warn("[CORE] Polling sync interrupted.");
        }
    }, 15000); 
}

function triggerClaimUI(key) {
    const popup = document.getElementById('claim-popup');
    if (popup && popup.style.display !== 'flex') {
        const display = document.getElementById('claim-key-display');
        if (display) display.innerText = key;
        popup.style.display = 'flex';
        if (window.playNotificationSound) window.playNotificationSound();
    }
}

/**
 * --- 6. UI RENDERERS ---
 */
function renderProfile() {
    const anchor = document.getElementById('profile-anchor');
    if (!anchor) return;

    const logoutLabel = currentUser.isGuest ? "TERMINATE GUEST" : "LOGOUT";
    const userColor = currentUser.isAdmin ? 'var(--gold)' : 'var(--electric-green)';
    const avatarUrl = currentUser.avatar || "https://github.com/identicons/user.png";

    anchor.innerHTML = `
        <div class="profile-card">
            <img src="${avatarUrl}" class="nav-avatar" style="border: 2px solid ${userColor}">
            <div class="profile-info">
                <span class="nav-username" style="color:${userColor}">
                    ${currentUser.username} 
                    ${currentUser.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}
                </span>
                <a href="/api/auth/logout" class="nav-logout">${logoutLabel}</a>
            </div>
        </div>`;
}

function handleAnonymousState() {
    console.log("[CORE] Standing by at Gateway. Login required.");
    const mainUI = document.getElementById('main-ui');
    if (mainUI) mainUI.style.display = 'none';
}

function setupTitleSecret() {
    const title = document.getElementById('app-title');
    if (!title) return;

    title.onclick = () => {
        titleClicks++;
        if (titleClicks === 5) {
            title.style.textShadow = "0 0 20px var(--gold)";
            title.style.color = "var(--gold)";
            titleClicks = 0; 
        }
    };
}

init();