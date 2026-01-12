/** SCE v1.0.1 [BETA] - CORE ENGINE & IDENTITY HANDSHAKE **/

let currentUser = null;
let recoveryCheckInterval = null;
let titleClicks = 0; 

/**
 * --- 1. BOOT SEQUENCE ---
 * Primary entry point. Handles session sync and UI state transitions.
 * Executes after DOM is ready and client.js modules are mounted.
 */
async function init() {
    console.log("%c[CORE] Initiating v1.0.1 BETA Handshake...", "color: #3498db; font-weight: bold;");
    setupTitleSecret(); 

    try {
        const res = await fetch('/api/auth/user');
        currentUser = await res.json();
        
        // Sync Global State for other scripts (NoA.js, client.js)
        window.currentUser = currentUser;

        if (currentUser.authenticated) {
            handleAuthenticatedState();
        } else {
            handleAnonymousState();
        }
    } catch (err) {
        console.error("[CORE CRITICAL] Handshake Protocol Failed:", err);
    }
}

/**
 * --- 2. AUTHENTICATED STATE LOGIC ---
 */
function handleAuthenticatedState() {
    // UI State Transition
    const authSection = document.getElementById('auth-section');
    const mainUI = document.getElementById('main-ui');
    
    if (authSection) authSection.style.display = 'none';
    if (mainUI) mainUI.style.display = 'block';
    
    // Activate Minibox Interface
    const trigger = document.getElementById('minibox-trigger');
    if (trigger) trigger.style.display = 'flex';

    renderProfile();
    
    // Initialize Repository Data
    if (window.fetchFiles) window.fetchFiles();

    // Check for pending items immediately on login
    syncSystemNotifications();

    // Start Recovery Monitoring (Bypassed for Guests & Admins)
    if (!currentUser.isAdmin && !currentUser.isGuest) {
        startRecoveryPolling();
    }
}

/**
 * --- 3. NOTIFICATION & RECOVERY SYNC ---
 */
function syncSystemNotifications() {
    if (currentUser.newRestoreAvailable) {
        // Red Dot logic for Nav
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = 'block';
        
        // Verification Minibox visibility
        const vBox = document.getElementById('verify-box');
        if (vBox && !currentUser.isAdmin) {
            vBox.style.display = 'block';
        }
        
        if (window.playNotificationSound) window.playNotificationSound();
    }
}

/**
 * --- 4. RECOVERY POLLING ---
 * Background loop that checks for Admin approvals every 15 seconds.
 */
function startRecoveryPolling() {
    if (recoveryCheckInterval) clearInterval(recoveryCheckInterval);

    recoveryCheckInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/auth/user');
            const data = await res.json();
            window.currentUser = data; // Update global reference

            if (data.newRestoreAvailable) {
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // Fetch specific recovery details (Key & Path)
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
    const vBox = document.getElementById('verify-box');
    if (vBox) vBox.style.display = 'block';

    const popup = document.getElementById('claim-popup');
    if (popup && popup.style.display !== 'flex') {
        const display = document.getElementById('claim-key-display');
        if (display) display.innerText = key;
        popup.style.display = 'flex';
        if (window.playNotificationSound) window.playNotificationSound();
    }
}

/**
 * --- 5. UI RENDERERS ---
 */
function renderProfile() {
    const anchor = document.getElementById('profile-anchor');
    if (!anchor) return;

    const logoutLabel = currentUser.isGuest ? "BACK TO LOGIN" : "DISCONNECT";
    const userColor = currentUser.isAdmin ? 'var(--gold)' : 'var(--electric-green)';
    const avatarUrl = currentUser.avatar || "https://github.com/identicons/user.png";

    anchor.innerHTML = `
        <div class="profile-card">
            <img src="${avatarUrl}" class="nav-avatar" style="border-color: ${userColor}">
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
    if (window.setupTOSListener) window.setupTOSListener();
    console.log("[CORE] Standing by at Gateway.");
}

/**
 * --- 6. SYSTEM SECRETS ---
 */
function setupTitleSecret() {
    const title = document.getElementById('app-title');
    if (!title) return;

    title.onclick = () => {
        titleClicks++;
        if (titleClicks === 5) {
            console.log("%c[DEV] High-Clearance Mode Confirmed.", "color: #f1c40f");
            title.style.textShadow = "0 0 10px var(--gold)";
            titleClicks = 0; 
        }
    };
}

// Kickoff Boot Sequence
init();