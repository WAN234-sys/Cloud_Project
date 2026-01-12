/** * SCE v1.0.1 [BETA] - MASTER CLIENT CONTROLLER 
 * ---------------------------------------------------------
 * Architecture: Modular Component Injection & Neural Link Init
 * Purpose: Acts as the primary orchestrator for the frontend.
 * ---------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("%c[SYSTEM] v1.0.1 BETA Boot Sequence Initiated...", "color: #2ecc71; font-weight: bold;");

    // 1. COMPONENT INJECTION REGISTRY
    // These IDs must match the <div> containers in your index.html
    const modules = [
        { id: 'comp-nav', file: 'nav.html' },
        { id: 'comp-repo', file: 'repo.html' },
        { id: 'comp-noa', file: 'noa.html' },
        { id: 'comp-minibox', file: 'minibox.html' },
        { id: 'comp-terminal', file: 'terminal.html' }
    ];

    /**
     * ASYNC LOADER FUNCTION
     * Fetches each HTML fragment and injects it into the DOM.
     */
    async function loadComponents() {
        try {
            // Use Promise.all for parallel loading to improve boot speed
            await Promise.all(modules.map(async (mod) => {
                const container = document.getElementById(mod.id);
                if (!container) {
                    console.warn(`[LOADER] Container ${mod.id} not found in index.html`);
                    return;
                }

                const response = await fetch(`/components/${mod.file}`);
                if (!response.ok) throw new Error(`HTTP_${response.status} while fetching ${mod.file}`);
                
                const htmlContent = await response.text();
                container.innerHTML = htmlContent;
                console.log(`[LOADER] ${mod.file} mounted successfully.`);
            }));

            // 2. LOGIC INITIALIZATION
            // We only trigger these once the HTML components exist in the DOM
            initializeLogicEngines();

        } catch (err) {
            console.error("[CRITICAL] Component Injection Failure:", err);
            // Fallback: Notify user if the UI fails to build
            const body = document.querySelector('body');
            if (body) {
                body.innerHTML += `
                    <div style="color: #ff4d4d; position: fixed; top: 0; left: 0; width: 100%; 
                                background: #1a1a1a; padding: 10px; z-index: 9999; text-align: center;
                                border-bottom: 2px solid #ff4d4d; font-family: monospace;">
                        SYSTEM_HALT: UI Fragments Missing. Check Render Logs.
                    </div>`;
            }
        }
    }

    /**
     * NEURAL LINK & SESSION INIT
     * Connects the brain (NoA.js) and identity (user.js).
     */
    function initializeLogicEngines() {
        console.log("[SYSTEM] Connecting Logic Engines...");

        // Start User Session (Identifies GitHub/Guest status)
        if (typeof initUserSession === 'function') {
            initUserSession();
            console.log("[SYSTEM] Identity Engine: Online.");
        } else {
            console.warn("[SYSTEM] Identity Engine (user.js) missing.");
        }

        // Start NoA Autonomous Brain (Monitoring inactivity/database)
        if (typeof initNoA === 'function') {
            initNoA();
            console.log("[SYSTEM] NoA AI Brain: Active.");
        } else {
            console.warn("[SYSTEM] NoA AI Brain (NoA.js) missing.");
        }

        // Initialize UI event listeners
        setupGlobalInteractions();
    }

    /**
     * GLOBAL INTERACTION HANDLERS
     */
    function setupGlobalInteractions() {
        // Handle Escape key to close any active terminals or overlays
        window.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                const noaTerm = document.getElementById('noa-terminal');
                const adminTerm = document.getElementById('admin-terminal');
                const claimModal = document.getElementById('claim-popup');

                if (noaTerm) noaTerm.style.display = 'none';
                if (adminTerm) adminTerm.style.display = 'none';
                if (claimModal) claimModal.style.display = 'none';
                
                console.log("[UI] System overlay reset.");
            }
        });

        console.log("[SYSTEM] Interaction layer established.");
    }

    // Trigger the boot sequence
    loadComponents();
});

/**
 * --- GLOBAL UTILITY: formatBytes ---
 * Standardized file size conversion for the UI.
 * Used by repo.html and NoA Diagnostic Reports.
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}