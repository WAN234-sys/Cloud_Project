/** SCE v1.0.4 [STABLE] - CLOUD ARCHIVE ENGINE **/

const CloudSync = {
    pendingDelete: null,

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
                        </button>
                        <button class="btn-delete" 
                                title="WARNING: This action is permanent."
                                onclick="CloudSync.confirmDelete('${file.name}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                container.appendChild(fileEl);
            });
        } catch (err) {
            console.error("[CLOUD] Failed to sync archive:", err);
        }
    },

    // 2. FILENAME SAFETY
    validateFilename: async (filename) => {
        try {
            const res = await fetch('/api/cloud/files');
            const files = await res.json();
            const exists = files.some(f => f.name.toLowerCase() === filename.toLowerCase());
            
            if (exists) {
                alert(`CONFLICT: A file named "${filename}" already exists.`);
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    // 3. PERMANENT DELETE FLOW
    confirmDelete: (filename) => {
        const overlay = document.getElementById('delete-confirm-popup');
        const targetText = document.getElementById('delete-target-name');
        
        if (overlay && targetText) {
            targetText.innerText = filename;
            overlay.style.display = 'flex';
            CloudSync.pendingDelete = filename; // Internal state
        }
    },

    executeDelete: async () => {
        const filename = CloudSync.pendingDelete;
        if (!filename) return;

        try {
            const res = await fetch(`/api/cloud/delete/${filename}`, { method: 'DELETE' });
            if (res.ok) {
                const popup = document.getElementById('delete-confirm-popup');
                if (popup) popup.style.display = 'none';
                CloudSync.pendingDelete = null;
                CloudSync.renderArchive(); 
            }
        } catch (err) {
            console.error("[CLOUD] Delete failed:", err);
        }
    },

    downloadAsset: (filename) => {
        // Creates a clean, temporary download trigger
        const link = document.createElement('a');
        link.href = `/api/cloud/download/${filename}`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Initialize Archive on load
document.addEventListener('DOMContentLoaded', CloudSync.renderArchive);

// Handle Cancel Button in Delete Popup (Add this for safety)
function closeDeleteModal() {
    const popup = document.getElementById('delete-confirm-popup');
    if (popup) popup.style.display = 'none';
    CloudSync.pendingDelete = null;
}