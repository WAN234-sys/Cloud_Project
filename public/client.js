/** SCE v1.0.3 [BETA] - CORE CLIENT LOGIC **/

const SCE = {
    shieldClicks: 0,
    terminalActive: false,

    init: async () => {
        console.log("SCE v1.0.3 [BETA] Initializing...");
        await SCE.syncIdentity();
        SCE.setupDragAndDrop();
        SCE.setupKeybinds();
        SCE.setupGuestHover();
    },

    // 1. IDENTITY SYNC: Handles 32px PFP and Shield Visibility
    syncIdentity: async () => {
        try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();

            if (data.authenticated) {
                // Show Dashboard, Hide Login
                document.getElementById('auth-session').style.display = 'none';
                document.getElementById('main-ui').style.display = 'block';

                // Set PFP (32px handled in CSS)
                const avatar = document.getElementById('user-avatar');
                if (avatar) avatar.src = data.user.avatar;

                // INVISIBLE TO ADMINS: Hide shield if user is Admin
                const shield = document.getElementById('recovery-shield-trigger');
                if (data.user.isAdmin && shield) {
                    shield.style.display = 'none';
                }

                // Green Notification Dot
                if (data.recoveryReady) {
                    document.getElementById('shield-notif').style.display = 'block';
                }
            }
        } catch (err) {
            console.error("Auth sync failed.");
        }
    },

    // 2. TRIPLE-CLICK SHIELD: Opens Recovery Mini-Box
    handleShieldClick: () => {
        SCE.shieldClicks++;
        if (SCE.shieldClicks === 3) {
            const miniBox = document.getElementById('recovery-mini-box');
            if (miniBox) {
                miniBox.style.display = 'block';
                miniBox.classList.add('center-left-popup');
            }
            SCE.shieldClicks = 0;
        }
        // Auto-reset if not clicked fast enough
        setTimeout(() => { SCE.shieldClicks = 0; }, 2000);
    },

    // 3. CLOUD UPLOAD: "upload project" Drag-and-Drop
    setupDragAndDrop: () => {
        const zone = document.getElementById('upload-zone');
        if (!zone) return;

        ['dragover', 'dragleave', 'drop'].forEach(name => {
            zone.addEventListener(name, (e) => e.preventDefault());
        });

        zone.addEventListener('drop', async (e) => {
            const file = e.dataTransfer.files[0];
            
            // Per-User Filename Safety check
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/cloud/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) alert(`Project [${file.name}] synced to Your Archive.`);
        });
    },

    // 4. KEYBINDS: Shift + Enter for Terminal
    setupKeybinds: () => {
        window.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key === 'Enter') {
                const term = document.getElementById('terminal-overlay');
                if (term) {
                    SCE.terminalActive = !SCE.terminalActive;
                    term.style.display = SCE.terminalActive ? 'flex' : 'none';
                }
            }
        });
    },

    // 5. GUEST HOVER: Show read-only note
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

function toggleProfileMenu() {
    const menu = document.getElementById('profile-ext');
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}