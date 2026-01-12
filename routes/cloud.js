/** SCE v1.0.3 [BETA] - CLOUD ARCHIVE ENGINE **/

const CloudSync = {
    // 1. RENDER ARCHIVE: Display files in "Your Archive"
    renderArchive: async () => {
        const container = document.getElementById('file-list-container');
        if (!container) return;

        try {
            const res = await fetch('/api/cloud/files');
            const files = await res.json();

            container.innerHTML = files.length === 0 
                ? '<p class="empty-msg">No assets found in your cloud archive.</p>' 
                : '';

            files.forEach(file => {
                const fileEl = document.createElement('div');
                fileEl.className = 'file-card';
                fileEl.innerHTML = `
                    <div class="file-info">
                        <i class="fas fa-file-code"></i>
                        <span>${file.name}</span>
                    </div>
                    <div class="file-actions">
                        <button class="btn-download" onclick="CloudSync.downloadAsset('${file.name}')">
                            <i class="fas fa-download"></i>
                        </a>
                        <button class="btn-delete" 
                                onmouseenter="CloudSync.showDeleteWarning(this)" 
                                onclick="CloudSync.confirmDelete('${file.name}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                container.appendChild(fileEl);
            });
        } catch (err) {
            console.error("Failed to sync archive.");
        }
    },

    // 2. FILENAME SAFETY: One user, one unique filename
    validateFilename: async (filename) => {
        const res = await fetch('/api/cloud/files');
        const files = await res.json();
        
        // Safety First: Checks if the user already owns a file with this name
        const exists = files.some(f => f.name.toLowerCase() === filename.toLowerCase());
        if (exists) {
            alert(`CONFLICT: A file named "${filename}" already exists in your archive. Please rename the project before uploading.`);
            return false;
        }
        return true;
    },

    // 3. PERMANENT DELETE FLOW
    showDeleteWarning: (el) => {
        // Triggers the hover warning style (White and Electric Green)
        el.setAttribute('title', 'WARNING: This action is permanent and cannot be undone.');
    },

    confirmDelete: async (filename) => {
        // Bottom-Middle Confirmation Popup logic
        const overlay = document.getElementById('delete-confirm-popup');
        const targetText = document.getElementById('delete-target-name');
        
        if (overlay && targetText) {
            targetText.innerText = filename;
            overlay.style.display = 'flex';
            
            // Store target in a global for the "Yes, Delete" button
            window.pendingDelete = filename;
        }
    },

    executeDelete: async () => {
        const filename = window.pendingDelete;
        if (!filename) return;

        const res = await fetch(`/api/cloud/delete/${filename}`, { method: 'DELETE' });
        if (res.ok) {
            document.getElementById('delete-confirm-popup').style.display = 'none';
            CloudSync.renderArchive(); // Refresh "Your Archive"
        }
    },

    downloadAsset: (filename) => {
        window.location.href = `/api/cloud/download/${filename}`;
    }
};

// Initialize Archive on load
document.addEventListener('DOMContentLoaded', CloudSync.renderArchive);