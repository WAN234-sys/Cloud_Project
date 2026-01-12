/** SCE v1.0.1 [BETA] - NoA NEURAL LOGIC **/

const NoA = {
    isActive: false,
    inactivityTimer: null,
    inactivityLimit: 45000, // 45 Seconds
    messages: {
        guest: [
            "Session is volatile. Identity preservation recommended.",
            "Restricted access detected. Redaction protocols active.",
            "Are you exploring, or just passing through the gate?"
        ],
        user: [
            "Neural link stable. Repository sync 100%.",
            "Waiting for source transmission...",
            "Your assets are secured in the Malaysia-Vault.",
            "Need to reconstitute a file? Check the Minibox."
        ],
        admin: [
            "High-clearance detected. Administrator WAN234 online.",
            "Ticket queue monitored. Verification keys ready.",
            "System integrity optimal. All cloud syncs active."
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
    
    // Hide thought bubble when terminal is opened
    if (bubble) bubble.style.display = 'none';
    
    if (!isVisible) {
        logToNoA("Neural interface expanded. Diagnostic active.");
    }
}

/**
 * 2. SYSTEM LOGGING
 */
function logToNoA(message, type = "SYS") {
    const output = document.getElementById('noa-output');
    if (!output) return;

    const time = new Date().toLocaleTimeString([], { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.marginBottom = '5px';
    entry.style.animation = 'fadeIn 0.3s ease-out';

    entry.innerHTML = `
        <span class="log-time" style="color:#555; font-size:10px;">[${time}]</span>
        <span class="log-sys" style="color:var(--electric-green); font-weight:bold;">[${type}]</span>
        <span class="log-msg" style="color:#ccc;">${message}</span>
    `;

    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
}

/**
 * 3. INACTIVITY MONITORING
 */
function resetInactivityTimer() {
    clearTimeout(NoA.inactivityTimer);
    
    // If NoA was "thinking" (bubble visible), hide it on movement
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
    
    if (!bubble || !msgSpan || !window.currentUser) return;

    // Select messages based on User Role
    let pool = NoA.messages.user;
    if (window.currentUser.isAdmin) pool = NoA.messages.admin;
    if (window.currentUser.isGuest) pool = NoA.messages.guest;

    const randomMsg = pool[Math.floor(Math.random() * pool.length)];
    
    msgSpan.innerText = randomMsg;
    bubble.style.display = 'block';
    
    logToNoA(randomMsg, "THOUGHT");
}

/**
 * 5. EVENT LISTENERS
 */
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);

// Initial Boot Log
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        logToNoA("SCE Core Bootstrapped.");
        logToNoA(`Identity: ${window.currentUser?.username || "Anonymous"}`);
        
        if (window.currentUser?.newRestoreAvailable) {
            logToNoA("CRITICAL: Asset reconstitution ready in Minibox.", "WARN");
        }
    }, 1000);
});