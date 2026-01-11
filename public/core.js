/** SCE v0.3.41 [BETA] - CORE ENGINE **/
let currentUser = null;
let recoveryCheckInterval = null;
let titleClicks = 0; 

/**
 * --- 1. BOOT SEQUENCE ---
 * Primary entry point. Handles session sync and UI state transitions.
 */
async function init() {
    console.log("CORE: Initiating v0.3.41 [BETA] Identity Handshake...");
    setupTitleSecret(); 

    try {
        const res = await fetch('/api/auth/user');
        currentUser = await res.json();
        
        if (currentUser.authenticated) {
            // UI State Transition: Switch from Login to Main App
            const authSection = document.getElementById('auth-section');
            const mainUI = document.getElementById('main-ui');
            
            if (authSection) authSection.style.display = 'none';
            if (mainUI) mainUI.style.display = 'block';
            
            // Activate Minibox Interface
            const trigger = document.getElementById('minibox-trigger');
            if (trigger) trigger.style.display = 'flex';

            renderProfile();
            
            // Initialization of Modular Logic from client.js
            if (window.setupActionListeners) setupActionListeners(); 
            if (window.fetchFiles) fetchFiles();

            // v0.3.41 State Check: Notify user of pending items
            handleInitialNotifications();

            // Start Recovery Monitoring (Locked for Guests)
            if (!currentUser.isAdmin && !currentUser.isGuest) {
                startRecoveryPolling();
            }
            
        } else {
            // Unauthenticated: Initialize Guest/TOS listener
            if (window.setupTOSListener) setupTOSListener();
        }
    } catch (err) {
        console.error("CORE: Handshake Protocol Failed", err);
    }
}

/**
 * --- 2. NOTIFICATION HANDLER ---
 * Triggers UI elements based on the 'newRestoreAvailable' flag.
 */
function handleInitialNotifications() {
    if (currentUser.newRestoreAvailable) {
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = 'block';
        
        // Show Verification Minibox if user has an unclaimed key
        const vBox = document.getElementById('verify-box');
        if (vBox && !currentUser.isAdmin) {
            vBox.style.display = 'block';
        }
        
        if (window.playNotificationSound) playNotificationSound();
    }
}

/**
 * --- 3. PROFILE RENDERER ---
 * Supports GitHub Avatars, Admin Badging, and dynamic logout labels.
 */
function renderProfile() {
    const anchor = document.getElementById('profile-anchor');
    if (!anchor) return;

    const logoutLabel = currentUser.isGuest ? "BACK TO LOGIN" : "LOGOUT";
    const userColor = currentUser.isAdmin ? 'var(--gold)' : 'var(--text-main)';
    const avatarUrl = currentUser.avatar || "https://github.com/identicons/user.png";

    anchor.innerHTML = `
        <div class="profile-card" style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
            <img src="${avatarUrl}" alt="pfp" style="width:38px; height:38px; border-radius:50%; border:1px solid var(--electric-green); background:#000;">
            <div>
                <div style="font-weight:bold; color:${userColor}; font-size:13px;">
                    ${currentUser.username} 
                    ${currentUser.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}
                </div>
                <a href="/api/auth/logout" style="font-size:10px; color:var(--text-muted); text-decoration:none; text-transform:uppercase;">${logoutLabel}</a>
            </div>
        </div>`;
}

/**
 * --- 4. RECOVERY POLLING ---
 * Background loop that checks for Admin approvals every 15 seconds.
 */
function startRecoveryPolling() {
    if (recoveryCheckInterval) clearInterval(recoveryCheckInterval);

    recoveryCheckInterval = setInterval(async () => {
        try {
            // Handshake Check
            const res = await fetch('/api/auth/user');
            const data = await res.json();

            if (data.newRestoreAvailable) {
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // Fetch specific recovery details
                const recRes = await fetch('/api/user/check-recovery');
                const recData = await recRes.json();

                if (recData.ready && !recData.claimed) {
                    const vBox = document.getElementById('verify-box');
                    if (vBox) vBox.style.display = 'block';

                    // Trigger the Claim Modal
                    const popup = document.getElementById('claim-popup');
                    if (popup && popup.style.display !== 'flex') {
                        document.getElementById('claim-key-display').innerText = recData.key;
                        popup.style.display = 'flex';
                        if (window.playNotificationSound) playNotificationSound();
                    }
                }
            }
        } catch (e) {
            console.warn("POLLING: Sync interrupted. Retrying in next cycle...");
        }
    }, 15000); 
}

/**
 * --- 5. SYSTEM SECRETS ---
 */
function setupTitleSecret() {
    const title = document.getElementById('app-title');
    if (!title) return;

    title.onclick = () => {
        titleClicks++;
        if (titleClicks === 5) {
            alert("SCE v0.3.41: Developer WAN234-sys confirmed. High-Clearance mode active.");
            titleClicks = 0; 
        }
    };
}

// Kickoff
init();