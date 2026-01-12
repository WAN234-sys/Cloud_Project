/** SCE v1.0.3 [BETA] - CORE ENGINE & IDENTITY HANDSHAKE **/

let currentUser = null;
let recoveryCheckInterval = null;

async function init() {
    console.log("%c[CORE] Initiating SCE v1.0.3 Handshake...", "color: #2ea44f; font-weight: bold;");
    
    try {
        const res = await fetch('/api/auth/status');
        currentUser = await res.json();
        window.currentUser = currentUser;

        // Route state based on Identity
        if (currentUser.authenticated && !currentUser.isGuest) {
            handleAuthenticatedState();
        } else if (currentUser.isGuest) {
            handleGuestState();
        } else {
            handleAnonymousState();
        }

        applyBranding();

    } catch (err) {
        console.error("[CORE CRITICAL] Handshake Protocol Failed:", err);
        handleAnonymousState();
    }
}

/**
 * --- 2. AUTHENTICATED STATE ---
 * Handles Dashboard transition and PFP alignment.
 */
function handleAuthenticatedState() {
    const authSection = document.getElementById('auth-session');
    const mainUI = document.getElementById('main-ui');
    
    if (authSection) authSection.style.display = 'none';
    if (mainUI) {
        mainUI.style.display = 'block';
    }
    
    // Hide Recovery Shield from Admin
    const shield = document.getElementById('recovery-shield-trigger');
    if (currentUser.user.isAdmin && shield) {
        shield.style.display = 'none';
    }

    renderProfile();
    
    // Start polling for the Green Notification Dot
    if (!currentUser.user.isAdmin) {
        startRecoveryPolling();
    }
}

/**
 * --- 3. GUEST LOCKDOWN ---
 * Shows repository but disables all interactions.
 */
function handleGuestState() {
    console.log("[CORE] Guest Mode: Interaction Restricted.");
    renderProfile();
    
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
        mainUI.style.display = 'block';
        mainUI.style.filter = 'grayscale(1)';
        mainUI.style.pointerEvents = 'none'; // Lock all clicks
    }
    
    // Reveal Guest Hover Note
    const guestNote = document.querySelector('.guest-tooltip');
    if (guestNote) guestNote.style.display = 'block';
}

/**
 * --- 4. BRANDING SYNC (v1.0.3) ---
 * Centers branding and updates Archive labels.
 */
function applyBranding() {
    const title = document.querySelector('.branding');
    if (title) {
        title.innerText = "SC EXPLORER";
        // Ensure middle-alignment logic is applied via parent flex
        title.parentElement.style.textAlign = "center";
    }

    const archiveLabel = document.querySelector('.archive-module h2');
    if (archiveLabel) archiveLabel.innerText = "Your Archive";
}

/**
 * --- 5. RECOVERY MONITORING ---
 * Polling for the Green Dot notification.
 */
function startRecoveryPolling() {
    if (recoveryCheckInterval) clearInterval(recoveryCheckInterval);

    recoveryCheckInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();
            
            if (data.recoveryReady) {
                const dot = document.getElementById('shield-notif');
                if (dot) {
                    dot.style.display = 'block';
                    dot.classList.add('glow-green'); // Electric Green
                }
            }
        } catch (e) {
            console.warn("[CORE] Polling sync interrupted.");
        }
    }, 10000); 
}

/**
 * --- 6. UI RENDERER (32px PFP LEFT) ---
 */
function renderProfile() {
    const container = document.querySelector('.nav-left');
    if (!container) return;

    const userColor = currentUser.user.isAdmin ? '#d4af37' : '#2ea44f';
    const avatarUrl = currentUser.user.avatar || "/assets/default.png";

    // Sets 32px PFP at left
    container.innerHTML = `
        <div class="pfp-anchor" onclick="toggleProfileMenu()">
            <img src="${avatarUrl}" id="user-avatar" 
                 style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid ${userColor}; align-self: flex-start;">
            <div id="profile-ext" class="ext-menu" style="display:none;">
                <div class="menu-item">Add Account</div>
                <hr>
                <a href="/api/auth/logout" class="menu-item logout">Log Out</a>
            </div>
        </div>`;
}

function handleAnonymousState() {
    const mainUI = document.getElementById('main-ui');
    if (mainUI) mainUI.style.display = 'none';
    const auth = document.getElementById('auth-session');
    if (auth) auth.style.display = 'flex';
}

init();