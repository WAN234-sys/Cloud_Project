/** * SCE v1.0.1 [BETA] - MASTER CLIENT CONTROLLER 
 * ---------------------------------------------------------
 * Architecture: Modular Component Injection & Logic Sync
 * Fixes: Search, Drag & Drop, UI Labels, and Identity Sync
 * ---------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("%c[SYSTEM] v1.0.1 BETA Boot Sequence Initiated...", "color: #2ecc71; font-weight: bold;");

    // 1. COMPONENT INJECTION REGISTRY
    const modules = [
        { id: 'comp-nav', file: 'nav.html' },
        { id: 'comp-repo', file: 'repo.html' },
        { id: 'comp-noa', file: 'noa.html' },
        { id: 'comp-minibox', file: 'minibox.html' },
        { id: 'comp-terminal', file: 'terminal.html' }
    ];

    /**
     * ASYNC LOADER FUNCTION
     */
    async function loadComponents() {
        try {
            await Promise.all(modules.map(async (mod) => {
                const container = document.getElementById(mod.id);
                if (!container) return;

                const response = await fetch(`/components/${mod.file}`);
                if (!response.ok) throw new Error(`HTTP_${response.status} while fetching ${mod.file}`);
                
                const htmlContent = await response.text();
                container.innerHTML = htmlContent;
                console.log(`[LOADER] ${mod.file} mounted.`);
            }));

            // 2. LOGIC INITIALIZATION (Triggered after HTML exists)
            initializeLogicEngines();
            updateUILabels();

        } catch (err) {
            console.error("[CRITICAL] Component Injection Failure:", err);
            document.body.innerHTML += `<div style="color:red; background:#000; position:fixed; top:0; width:100%; text-align:center; z-index:9999;">SYSTEM_HALT: UI Fragments Missing.</div>`;
        }
    }

    /**
     * UI LABEL UPDATES
     * Fixes: SC EXPLORER size and "Your Archive" text
     */
    function updateUILabels() {
        // Update Title branding
        const mainTitle = document.querySelector('.main-header h1') || document.querySelector('#sc-title');
        if (mainTitle) {
            mainTitle.innerText = "SC EXPLORER";
            mainTitle.style.fontSize = "3.5rem"; // Make it big
            mainTitle.style.fontWeight = "900";
            mainTitle.style.letterSpacing = "8px";
        }

        // Update Archive label
        const archiveLabel = document.getElementById('archive-title');
        if (archiveLabel) archiveLabel.innerText = "Your Archive";
    }

    /**
     * NEURAL LINK & SESSION INIT
     */
    function initializeLogicEngines() {
        // Start Identity Engine (Fixed 'SYNCHRONIZING_IDENTITY' hang)
        if (typeof initUserSession === 'function') {
            initUserSession();
        }

        // Start NoA (AI working fix)
        if (window.NoA && typeof window.NoA.boot === 'function') {
            window.NoA.boot();
        } else if (typeof initNoA === 'function') {
            initNoA();
        }

        setupGlobalInteractions();
    }

    /**
     * GLOBAL INTERACTION HANDLERS
     * Fixes: Search, Drag & Drop, Terminal Close
     */
    function setupGlobalInteractions() {
        // 1. SEARCH FUNCTIONALITY FIX
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.file-row').forEach(row => {
                    const fileName = row.querySelector('.file-info div')?.innerText.toLowerCase() || "";
                    row.style.display = fileName.includes(term) ? 'flex' : 'none';
                });
            });
        }

        // 2. DRAG & DROP UPLOAD FIX
        const dropZone = document.getElementById('drop-zone') || document.body;
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        dropZone.addEventListener('drop', (e) => {
            if (window.currentUser?.isGuest) return; // Silent block for guests
            const files = e.dataTransfer.files;
            if (files.length > 0 && typeof uploadFile === 'function') {
                uploadFile(files[0]);
            }
        });

        // 3. HOTKEYS (Escape to close)
        window.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                ['noa-terminal', 'admin-terminal-overlay', 'claim-popup'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
            }
        });
    }

    loadComponents();
});

// GLOBAL UTILITY
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
}