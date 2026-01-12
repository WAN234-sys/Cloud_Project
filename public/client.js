/** SCE v1.0.4 [STABLE] - CORE CLIENT LOGIC **/

const SCE = {
    shieldClicks: 0,
    clickTimer: null, // Track timer to prevent race conditions
    terminalActive: false,

    init: async () => {
        console.log("SCE v1.0.4 [STABLE] Initializing...");
        await SCE.syncIdentity();
        SCE.setupDragAndDrop();
        SCE.setupKeybinds();
        SCE.setupGuestHover();
    },

    // 1. IDENTITY SYNC
    syncIdentity: async () => {
        try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();

            if (data.authenticated) {
                document.getElementById('auth-session').style.display = 'none';
                document.getElementById('main-ui').style.display = 'block';

                const avatar = document.getElementById('user-avatar');
                if (avatar) avatar.src = data.user.avatar || '/assets/default-avatar.png';

                // Ensure ID matches your HTML trigger
                const shield = document.getElementById('recovery-shield-trigger');
                if (data.user.isAdmin && shield) {
                    shield.style.display = 'none';
                }

                if (data.recoveryReady) {
                    const dot = document.getElementById('shield-notif');
                    if (dot) dot.style.display = 'block';
                }
            }
        } catch (err) {
            console.error("Auth sync failed.");
        }
    },

    // 2. TRIPLE-CLICK LOGIC (Improved)
    handleShieldClick: () => {
        // Clear existing timer
        if (SCE.clickTimer) clearTimeout(SCE.clickTimer);

        SCE.shieldClicks++;

        if (SCE.shieldClicks === 3) {
            const miniBox = document.getElementById('recovery-mini-box');
            if (miniBox) {
                const isHidden = miniBox.style.display === 'none' || miniBox.style.display === '';
                miniBox.style.display = isHidden ? 'block' : 'none';
                if (isHidden) miniBox.classList.add('center-left-popup');
            }
            SCE.shieldClicks = 0;
        } else {
            // Reset if 3rd click doesn't happen within 800ms (standard triple-click speed)
            SCE.clickTimer = setTimeout(() => {
                SCE.shieldClicks = 0;
            }, 800);
        }
    },

    // 3. CLOUD UPLOAD
    setupDragAndDrop: () => {
        const zone = document.getElementById('upload-zone');
        if (!zone) return;

        ['dragover', 'dragleave', 'drop'].forEach(name => {
            zone.addEventListener(name, (e) => e.preventDefault());
        });

        zone.addEventListener('drop', async (e) => {
            const file = e.dataTransfer.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/cloud/upload', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    alert(`Project [${file.name}] synced to Your Archive.`);
                }
            } catch (err) {
                console.error("Upload failed:", err);
            }
        });
    },

    // 4. KEYBINDS (Updated ID for Admin Terminal)
    setupKeybinds: () => {
        window.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key === 'Enter') {
                // Ensure this matches the ID in terminal.html
                const term = document.getElementById('admin-terminal-overlay');
                if (term) {
                    const isHidden = term.style.display === 'none' || term.style.display === '';
                    term.style.display = isHidden ? 'flex' : 'none';
                    
                    // Trigger terminal logic if it exists
                    if (isHidden && typeof window.refreshAdminTickets === 'function') {
                        window.refreshAdminTickets();
                    }
                }
            }
        });
    },

    // 5. GUEST HOVER
    setupGuestHover: () => {
        const guestBtn = document.querySelector('.btn-guest');
        const note = document.querySelector('.guest-tooltip');
        if (guestBtn && note) {
            guestBtn.addEventListener('mouseenter', () => note.style.opacity = '1');
            guestBtn.addEventListener('mouseleave', () => note.style.opacity = '0');
        }
    }
};

// Global Listeners
document.addEventListener('DOMContentLoaded', SCE.init);

// Map the global shield click to the SCE object
function handleShieldClick() {
    SCE.handleShieldClick();
}

function toggleProfileMenu() {
    const menu = document.getElementById('profile-ext');
    if (menu) {
        const isHidden = menu.style.display === 'none' || menu.style.display === '';
        menu.style.display = isHidden ? 'block' : 'none';
    }
}