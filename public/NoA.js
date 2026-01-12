/** * SCE v1.0.4 [STABLE] - NoA NEURAL LOGIC & CLEARANCE SYSTEM
 * Includes: Inactivity, AI Thoughts, Terminal, and Repo Lockdown
 **/

const NoA = {
    isActive: false,
    inactivityTimer: null,
    inactivityLimit: 45000, // 45 Seconds
    messages: {
        guest: [
            "SESSION_VOLATILE: Identity preservation recommended.",
            "RESTRICTED_ACCESS: Redaction protocols active.",
            "Identity unverified. Search and Transmission disabled.",
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
    },

    /** 1. TERMINAL UI CONTROL **/
    toggle: function() {
        const term = document.getElementById('noa-terminal');
        const bubble = document.getElementById('noa-thought-bubble');
        if (!term) return;

        const isVisible = term.style.display === 'flex';
        term.style.display = isVisible ? 'none' : 'flex';
        
        if (bubble) bubble.style.display = 'none';
        
        if (!isVisible) {
            this.log("Neural interface expanded. Diagnostic active.");
            setTimeout(() => document.getElementById('noa-input')?.focus(), 100);
        }
    },

    /** 2. LOGGING ENGINE **/
    log: function(message, type = "SYS") {
        const output = document.getElementById('noa-output');
        if (!output) return;

        const time = new Date().toLocaleTimeString([], { hour12: false });
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.style.cssText = "margin-bottom: 8px; font-size: 11px; opacity: 0; transition: opacity 0.3s ease-in;";

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
    },

    /** 3. INPUT HANDLER **/
    sendQuery: function() {
        const input = document.getElementById('noa-input');
        if (input && input.value.trim()) {
            this.log(input.value, "USER");
            // Here you can add custom AI responses based on keywords
            input.value = '';
        }
    },

    /** 4. AUTONOMOUS THOUGHTS **/
    triggerThought: function() {
        const bubble = document.getElementById('noa-thought-bubble');
        const msgSpan = document.getElementById('noa-short-msg');
        const term = document.getElementById('noa-terminal');
        
        // Block thoughts if terminal is open to prevent overlap
        if (!bubble || !msgSpan || (term && term.style.display === 'flex')) return;

        const userObj = window.currentUser || { isGuest: true };
        let pool = this.messages.user;

        if (userObj.user?.isAdmin) {
            pool = this.messages.admin;
        } else if (userObj.isGuest) {
            pool = this.messages.guest;
        }

        const randomMsg = pool[Math.floor(Math.random() * pool.length)];
        msgSpan.innerText = randomMsg;
        bubble.style.display = 'block';
        this.log(randomMsg, "THOUGHT");
    }
};

/**
 * 5. REPOSITORY CLEARANCE & LOCKDOWN
 */
function updateRepoClearance(isGuest) {
    const gate = document.getElementById('transmission-gate');
    const lockMsg = document.getElementById('guest-lock-msg');
    
    if (gate && lockMsg) {
        if (isGuest) {
            gate.classList.add('guest-lock');
            lockMsg.style.display = 'flex';
        } else {
            gate.classList.remove('guest-lock');
            lockMsg.style.display = 'none';
        }
    }
}

/**
 * 6. GLOBAL INITIALIZATION & EVENT LISTENERS
 */
function resetInactivityTimer() {
    clearTimeout(NoA.inactivityTimer);
    const bubble = document.getElementById('noa-thought-bubble');
    if (bubble) bubble.style.display = 'none';

    NoA.inactivityTimer = setTimeout(() => NoA.triggerThought(), NoA.inactivityLimit);
}

// Global Activity Listeners
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keydown', resetInactivityTimer);

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Boot Log
    NoA.log("SCE Neural Core Bootstrapped.");

    // 2. Identity Sync Loop (Waits for Auth Bridge to load user data)
    const identitySync = setInterval(() => {
        if (window.currentUser) {
            const userObj = window.currentUser;
            const tag = document.getElementById('noa-clearance-tag');
            
            // Apply Repo Clearance
            updateRepoClearance(userObj.isGuest);

            if (userObj.isGuest) {
                if (tag) tag.innerText = "GUEST_LINK";
                document.getElementById('noa-wrapper')?.classList.add('noa-restricted');
                NoA.log("WARN: Session is volatile. Interaction restricted.", "WARN");
            } else if (userObj.user?.isAdmin) {
                if (tag) tag.innerText = "ADMIN_CLEARANCE";
                NoA.log(`Link Verified: Administrator ${userObj.user.username}`);
            } else {
                if (tag) tag.innerText = "USER_LEVEL_1";
                NoA.log(`Link Verified: ${userObj.user.username}`);
            }

            // Check if user has a pending 6-6-6-6 key
            if (userObj.recoveryReady) {
                NoA.log("RECOVERY_PROTOCOL: Asset reconstitution ready in Minibox.", "WARN");
                const banner = document.getElementById('notif-banner');
                if (banner) banner.style.display = 'flex';
            }

            clearInterval(identitySync);
        }
    }, 200);

    // 3. UI Listeners
    document.getElementById('noa-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') NoA.sendQuery();
    });

    // Safety: Stop checking identity after 5s
    setTimeout(() => clearInterval(identitySync), 5000);
});