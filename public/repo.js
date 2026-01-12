/** SCE v1.0.4 [STABLE] - REPOSITORY & TRANSMISSION LOGIC **/

const Repo = {
    myFiles: [],
    othersFiles: [],

    /** 1. INITIALIZE **/
    init: function() {
        this.refreshVault();
        this.setupEventListeners();
        this.checkPendingRecovery(); // Added: Checks for keys on boot
    },

    /** 2. FETCH ASSETS FROM VAULT **/
    refreshVault: async function() {
        try {
            const response = await fetch('/api/session');
            const session = await response.json();

            // Fetch public and private files from your Supabase bridge
            const vaultRes = await fetch('/api/vault/files');
            const data = await vaultRes.json();

            if (data.success) {
                this.myFiles = data.files.filter(f => f.owner === session.user?.username);
                this.othersFiles = data.files.filter(f => f.owner !== session.user?.username);
                this.renderGrids();
            }
        } catch (err) {
            console.error("VAULT_FETCH_ERROR:", err);
            if (typeof NoA !== 'undefined') NoA.log("Failed to sync with Malaysia-Vault.", "WARN");
        }
    },

    /** 3. RENDER FILE CARDS **/
    renderGrids: function() {
        const myContainer = document.getElementById('my-file-list');
        const othersContainer = document.getElementById('others-file-list');

        if (myContainer) {
            myContainer.innerHTML = this.myFiles.length ? '' : '<div class="loading-shimmer">NO_ASSETS_FOUND</div>';
            this.myFiles.forEach(file => myContainer.appendChild(this.createFileCard(file, true)));
            document.getElementById('my-count').innerText = this.myFiles.length;
        }

        if (othersContainer) {
            othersContainer.innerHTML = '';
            this.othersFiles.forEach(file => othersContainer.appendChild(this.createFileCard(file, false)));
            document.getElementById('others-count').innerText = this.othersFiles.length;
        }
    },

    /** 4. CREATE CARD ELEMENT **/
    createFileCard: function(file, isOwner) {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.style.cssText = `
            background: #161b22;
            border: 1px solid #30363d;
            padding: 15px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        const statusColor = file.status === 'reconstituted' ? '#00ff41' : '#ffd700';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <i class="fas fa-file-code" style="color:#8b949e; font-size: 20px;"></i>
                <small style="color:${statusColor}; font-size:9px; font-weight:bold;">${file.status.toUpperCase()}</small>
            </div>
            <div style="font-weight:bold; font-size:13px; color:#fff;">${file.filename}</div>
            <div style="font-size:10px; color:#555;">OWNER: ${file.owner}</div>
            <div style="margin-top:10px; display:flex; gap:10px;">
                <button onclick="Repo.download('${file.id}')" style="flex:1; background:#21262d; border:1px solid #30363d; color:#fff; font-size:10px; padding:5px; cursor:pointer;">DOWNLOAD</button>
                ${isOwner && file.status === 'locked' ? `<button onclick="Repo.openMinibox('${file.filename}')" style="flex:1; background:rgba(255, 215, 0, 0.1); border:1px solid #ffd700; color:#ffd700; font-size:10px; cursor:pointer;">RECONSTITUTE</button>` : ''}
            </div>
        `;
        return card;
    },

    /** 5. UPLOAD LOGIC **/
    handleUpload: async function() {
        const fileInput = document.getElementById('cfile');
        if (!fileInput.files[0]) return alert("Please select a .c file first.");

        const btn = document.getElementById('uploadBtn');
        const progressContainer = document.getElementById('upload-progress-container');
        const progressFill = document.getElementById('progress-fill');

        // UI State
        btn.disabled = true;
        progressContainer.style.display = 'block';
        
        // Mock Progress Animation for the "Sync" feel
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 95) clearInterval(interval);
            progressFill.style.width = `${Math.min(progress, 95)}%`;
        }, 200);

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            const res = await fetch('/api/vault/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                progressFill.style.width = '100%';
                if (typeof NoA !== 'undefined') NoA.log("Transmission Successful. Asset locked in Vault.");
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    btn.disabled = false;
                    this.refreshVault();
                }, 1000);
            }
        } catch (err) {
            if (typeof NoA !== 'undefined') NoA.log("TRANSMISSION_FAILED: Connection to Malaysia-Vault lost.", "WARN");
            btn.disabled = false;
        }
    },

    /** 6. MINIBOX & CLAIM LOGIC **/
    // Replaces the old prompt with your custom popup
    openMinibox: function(filename) {
        const key = prompt(`ENTER 6-6-6-6 RECOVERY KEY FOR: ${filename}`);
        if (key) this.verifyKey(key);
    },

    // New: Triggered when Admin issues a key
    displayClaimPopup: function(key) {
        const modal = document.getElementById('claim-popup');
        const display = document.getElementById('claim-key-display');
        if (modal && display) {
            display.innerText = key;
            modal.style.display = 'flex';
        }
    },

    // New: Startup check for pending recovery tickets
    checkPendingRecovery: async function() {
        const res = await fetch('/api/session');
        const session = await res.json();
        if (session.recoveryReady) {
            // NoA warns user there is a key waiting
            if (typeof NoA !== 'undefined') NoA.log("RECOVERY_PROTOCOL: Unclaimed asset detected.", "WARN");
            // You can trigger displayClaimPopup here if you have the key
        }
    },

    verifyKey: async function(key) {
        const res = await fetch('/api/user/verify-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });
        const data = await res.json();

        if (data.success) {
            if (typeof NoA !== 'undefined') NoA.log("Protocol 6-6-6-6 Verified. Asset Reconstituted.", "SYS");
            alert("ASSET RECONSTITUTED SUCCESSFULLY.");
            this.refreshVault();
        } else {
            alert("INVALID_KEY: Verification failed.");
        }
    },

    /** 7. UI LISTENERS **/
    setupEventListeners: function() {
        // File selection label update
        document.getElementById('cfile')?.addEventListener('change', (e) => {
            const name = e.target.files[0]?.name || "SELECT_C_SOURCE";
            document.getElementById('file-label-text').innerText = name;
        });
    },

    download: function(fileId) {
        window.location.href = `/api/vault/download/${fileId}`;
    }
};

/** GLOBAL MODAL HELPERS **/
function closeClaimPopup() {
    document.getElementById('claim-popup').style.display = 'none';
}

async function handleKeyCopy() {
    const keyText = document.getElementById('claim-key-display').innerText;
    const tip = document.getElementById('copy-success-tip');
    try {
        await navigator.clipboard.writeText(keyText);
        tip.style.display = 'block';
        setTimeout(() => tip.style.display = 'none', 2000);
    } catch (err) {
        console.error('Copy failed');
    }
}

// Start the Repo engine
document.addEventListener('DOMContentLoaded', () => Repo.init());