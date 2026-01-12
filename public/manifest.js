/** SCE v1.0.3 [BETA] - SYSTEM MANIFEST & BOOTLOADER **/

const SCE_MODULES = [
    'user.js',      // 1. Identity first
    'upload.js',    // 2. Transmission 
    'terminal.js',  // 3. Command Bridge
    'bridge.js',    // 4. Component Glue
    'verify.js',    // 5. Verification Logic
    'verifybox.js'  // 6. UI Interactions
];

function initializeSystem() {
    console.log("%c SC_EXPLORER_v1.0.3: INITIALIZING BOOT_SEQUENCE ", "background: #00ff41; color: #000; font-weight: bold;");
    
    // Check if critical DOM elements are present
    const requiredElements = ['auth-session', 'main-ui', 'modal-mount'];
    const missing = requiredElements.filter(id => !document.getElementById(id));

    if (missing.length > 0) {
        console.error(`[CRITICAL] System Malfunction: Missing DOM Mounts: ${missing.join(', ')}`);
        return;
    }

    console.log("[SYS] Neural modules verified. System Online.");
}

// Trigger boot sequence once all scripts are parsed
document.addEventListener('DOMContentLoaded', initializeSystem);