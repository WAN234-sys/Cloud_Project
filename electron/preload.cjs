// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('netkit', {
  // --- Existing ---
  runTool: (tool, args) => ipcRenderer.invoke('tool:run', { tool, args }),

  // MiRAi
  setApiKey: (key) => ipcRenderer.invoke('mirai:setKey', key),
  hasApiKey: () => ipcRenderer.invoke('mirai:hasKey'),
  clearApiKey: () => ipcRenderer.invoke('mirai:clearKey'),
  askMirai: (messages, model) => ipcRenderer.invoke('mirai:ask', { messages, model }),

  // Folder backup
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  readFolder: (folderPath) => ipcRenderer.invoke('folder:read', folderPath),

  // --- NEW: Tracker ---
  tracker: {
    start: () => ipcRenderer.invoke('tracker:start'),
    stop: () => ipcRenderer.invoke('tracker:stop'),
    status: () => ipcRenderer.invoke('tracker:status'),
    collect: () => ipcRenderer.invoke('tracker:collect'),
    flushCache: () => ipcRenderer.invoke('tracker:flushCache'),
  },
});
