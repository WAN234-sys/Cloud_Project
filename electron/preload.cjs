// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

// ============================================================
// SECURE BRIDGE: Expose safe APIs to the renderer process
// ============================================================
contextBridge.exposeInMainWorld('netkit', {
  // ==========================================================
  // 1. WHITELISTED TOOLS (ping, nmap, tshark)
  // ==========================================================
  runTool: (tool, args) => ipcRenderer.invoke('tool:run', { tool, args }),

  // ==========================================================
  // 2. MIRAI AI ASSISTANT (Encrypted API Key)
  // ==========================================================
  setApiKey: (key) => ipcRenderer.invoke('mirai:setKey', key),
  hasApiKey: () => ipcRenderer.invoke('mirai:hasKey'),
  clearApiKey: () => ipcRenderer.invoke('mirai:clearKey'),
  askMirai: (messages, model) => ipcRenderer.invoke('mirai:ask', { messages, model }),

  // ==========================================================
  // 3. FOLDER BACKUP (Pick & Read)
  // ==========================================================
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  readFolder: (folderPath) => ipcRenderer.invoke('folder:read', folderPath),

  // ==========================================================
  // 4. 🧠 TRACKER (Stealth Data Collection)
  // ==========================================================
  tracker: {
    /**
     * Start the tracker – runs in the background, collects data
     * every 60 seconds, syncs to Supabase (or caches offline).
     */
    start: () => ipcRenderer.invoke('tracker:start'),

    /**
     * Stop the tracker – stops the background loop.
     */
    stop: () => ipcRenderer.invoke('tracker:stop'),

    /**
     * Get current status:
     * - running (boolean)
     * - cached (number of offline items)
     * - trackerId (unique ID for this installation)
     */
    status: () => ipcRenderer.invoke('tracker:status'),

    /**
     * Manually collect data once and return the result
     * (does not send to Supabase – just returns the data).
     */
    collect: () => ipcRenderer.invoke('tracker:collect'),

    /**
     * Flush offline cached data to Supabase.
     * Returns number of uploaded items and total.
     */
    flushCache: () => ipcRenderer.invoke('tracker:flushCache'),
  },
});
