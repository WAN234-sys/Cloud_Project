/** SCE v1.0.4 [STABLE] - SYSTEM MANIFEST & HEALTH CHECK **/

const SYSTEM_HEALTH = {
    domReady: false,
    authSynced: false,
    componentsMounted: false
};

function initializeSystem() {
    console.log("%c SC_EXPLORER_v1.0.4: BOOT_SEQUENCE_START ", "background: #00ff41; color: #000; font-weight: bold;");
    
    // 1. DOM Check
    const requiredElements = ['auth-session', 'main-ui', 'modal-mount', 'terminal-mount'];
    const missing = requiredElements.filter(id => !document.getElementById(id));

    if (missing.length > 0) {
        console.error(`[CRITICAL] BOOT_FAILURE: Missing Mounts: ${missing.join(', ')}`);
        // Optional: Show a "System Error" overlay to the user
        return;
    }

    SYSTEM_HEALTH.domReady = true;
    console.log("[SYS] DOM Infrastructure: VERIFIED.");
}

/**
 * Global Health Monitor
 * Other scripts (like bridge.js) can call this to update status.
 */
window.updateSystemStatus = (module) => {
    console.log(`[SYS] Module Synced: ${module}`);
    if (module === 'BRIDGE') SYSTEM_HEALTH.componentsMounted = true;
    if (module === 'IDENTITY') SYSTEM_HEALTH.authSynced = true;

    if (SYSTEM_HEALTH.authSynced && SYSTEM_HEALTH.componentsMounted) {
        console.log("%c[SYS] SYSTEM_FULLY_OPERATIONAL", "color: #00ff41; font-weight: bold;");
    }
};

document.addEventListener('DOMContentLoaded', initializeSystem);