/** SCE v1.0.3 [BETA] - NoA NEURAL LOGIC **/

const NoA = {
    isActive: false,
    inactivityTimer: null,
    inactivityLimit: 45000, // 45 Seconds
    messages: {
        guest: [
            "SESSION_VOLATILE: Identity preservation recommended.",
            "RESTRICTED_ACCESS: Redaction protocols active.",
            "Identity unverified. Search and Transmission disabled.",
            "Are you exploring, or just passing through the gate?",
            "Neural link limited. Login via GitHub for full clearance."
        ],
        user: [
            "Neural link stable. Repository sync 100%.",
            "Waiting for source transmission...",
            "Your assets are secured in the Malaysia-Vault.",
            "Need to reconstitute a file? Check the Minibox.",
            "System integrity optimal. Standing by."
        ],
        admin: [
            "CLEARANCE_HIGH: Administrator WAN234 online.",
            "Ticket queue monitored. Verification keys ready.",
            "Bridge active. Monitoring repository health.",
            "System root access granted. Welcome back."
        ]
    }
};

/**
 * 1. TERMINAL TOGGLE
 */
function toggleNoATerminal() {
    const term = document.getElementById('noa-terminal');
    const bubble = document.getElementById('noa-thought-bubble');
    
    if (!term) return;

    const isVisible = term.style.display === 'flex';
    term.style.display = isVisible ? 'none' : 'flex';
    
    // Hide thought bubble when terminal is opened to clear UI
    if (bubble) bubble.style.display = 'none';
    
    if (!isVisible) {
        logToNoA("Neural interface expanded. Diagnostic active.");
        // Auto-focus input for immediate interaction
        setTimeout(() => document.getElementById('noa-input')?.focus(), 100);
    }
}

/**
 * 2. SYSTEM LOGGING (The Terminal Output)
 */
function logToNoA(message, type = "SYS") {
    const output = document.getElementById('noa-output');
    if (!output) return;

    const time = new Date().toLocaleTimeString([], { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.cssText = "margin-bottom: 8px; font-size: 11px; opacity: 0; transition: opacity 0.3s ease-in;";

    // Color logic based on type
    let typeColor = "#00ff41"; // Electric Green
    if (type === "WARN") typeColor = "#ff4d4d"; // Alert Red
    if (type === "THOUGHT") typeColor = "#ffd700"; // Recovery Gold
    if (type === "USER") typeColor = "#ffffff"; // Standard White

    entry.innerHTML = `
        <span class="log-time" style="color:#555;">[${time}]</span>
        <span class="log-sys" style="color:${typeColor}; font-weight:bold;">[${type}]</span>
        <span class="log-msg" style="color:#d1d1d1;">${message}</span>
    `;

    output.appendChild(entry);
    setTimeout(() => entry.style.opacity = '1', 10);
    output.scrollTop = output.scrollHeight;
}

/**
 * 3. INACTIVITY MONITORING
 */
function resetInactivityTimer() {
    clearTimeout(NoA.inactivityTimer);
    
    const bubble = document.getElementById('noa-thought-bubble');
    if (bubble && bubble.style.display === 'block') {
        bubble.style.display = 'none';
    }

    NoA.inactivityTimer = setTimeout(() => {
        triggerNoAThought();
    }, NoA.inactivityLimit);
}

/**
 * 4. AUTONOMOUS INTERACTION
 */
function triggerNoAThought() {
    const bubble = document.getElementById('noa-thought-bubble');
    const msgSpan = document.getElementById('noa-short-msg');
    const user = window.currentUser?.user;
    
    if (!bubble || !msgSpan || !window.currentUser) return;

    // 1. Determine Identity Pool
    let pool = NoA.messages.user;
    if (user?.isAdmin || user?.username === 'WAN234') {
        pool = NoA.messages.admin;
    } else if (window.currentUser.isGuest) {
        pool = NoA.messages.guest;
        document.getElementById('noa-wrapper')?.classList.add('noa-restricted');
    }

    // 2. Selection Logic
    const randomMsg = pool[Math.floor(Math.random() * pool.length)];
    
    // 3. UI Execution
    msgSpan.innerText = randomMsg;
    bubble.style.display = 'block';
    
    logToNoA(randomMsg, "THOUGHT");
}

/**
 * 5. INITIALIZATION & SYNC
 */
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);

document.addEventListener('DOMContentLoaded', () => {
    // Initial Boot Sequence
    setTimeout(() => {
        const user = window.currentUser?.user;
        const username = user?.username || "Anonymous";
        const tag = document.getElementById('noa-clearance-tag');
        
        logToNoA("SCE Neural Core Bootstrapped.");
        logToNoA(`Link Verified: ${username}`);

        if (window.currentUser?.isGuest) {
            if (tag) tag.innerText = "GUEST_LINK";
            logToNoA("WARN: Session is volatile. Interaction restricted.", "WARN");
        } else if (user?.isAdmin) {
            if (tag) tag.innerText = "ADMIN_CLEARANCE";
            logToNoA("Status: Administrator bridge operational.");
        } else {
            if (tag) tag.innerText = "USER_LEVEL_1";
        }

        // Recovery Banner Check
        if (window.currentUser?.recoveryReady) {
            logToNoA("RECOVERY_PROTOCOL: Asset reconstitution ready in Minibox.", "WARN");
            const banner = document.getElementById('notif-banner');
            if (banner) banner.style.display = 'flex';
        }
    }, 1200);

    // Send Button Listener
    document.getElementById('noa-send-btn')?.addEventListener('click', () => {
        const input = document.getElementById('noa-input');
        if (input && input.value.trim()) {
            logToNoA(input.value, "USER");
            input.value = '';
        }
    });

    // Enter Key Listener for Input
    document.getElementById('noa-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const input = document.getElementById('noa-input');
            if (input.value.trim()) {
                logToNoA(input.value, "USER");
                input.value = '';
            }
        }
    });
});