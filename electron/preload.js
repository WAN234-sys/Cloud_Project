import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('netkit', {
  /**
   * Run a whitelisted external tool (nmap, tshark, ping) with explicit
   * argument arrays. See electron/main.js for the whitelist + the
   * reason arguments are never treated as a raw shell string.
   */
  runTool: (tool, args) => ipcRenderer.invoke('tool:run', { tool, args }),

  // MiRAi: the AI assistant. The API key never touches the renderer —
  // it's set once, encrypted, and stored/used entirely in the main process.
  setApiKey: (key) => ipcRenderer.invoke('mirai:setKey', key),
  hasApiKey: () => ipcRenderer.invoke('mirai:hasKey'),
  clearApiKey: () => ipcRenderer.invoke('mirai:clearKey'),
  askMirai: (messages, model) => ipcRenderer.invoke('mirai:ask', { messages, model }),
});
