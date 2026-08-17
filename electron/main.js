// electron/main.js
import { app, BrowserWindow, ipcMain, safeStorage, dialog } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

// ============================================================
// NEW: import tracker module and Supabase client
// ============================================================
import { 
    startTracker, stopTracker, getStatus, 
    collectAllData, getCachedData, clearCachedData,
    reportToSupabase 
} from './tracker.js';
import { supabase } from '../src/lib/cloud.js';  // your Supabase client

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#0b0f0d',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// --- Auto-update (unchanged) ---
if (!isDev) {
  autoUpdater.on('update-downloaded', (info) => {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update ready',
        message: `Mnetto ${info.version} has been downloaded.`,
        detail: 'Restart now to install it, or it will install automatically next time you quit.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err.message);
  });
}

app.whenReady().then(() => {
  createWindow();
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================
// ORIGINAL IPC HANDLERS (tool:run, MiRAi, folder backup)
// ============================================================
const TOOL_BINARIES = {
  nmap: 'nmap',
  tshark: 'tshark',
  ping: process.platform === 'win32' ? 'ping' : 'ping',
};

ipcMain.handle('tool:run', async (_event, { tool, args }) => {
  const bin = TOOL_BINARIES[tool];
  if (!bin) {
    return { ok: false, error: `Unknown or disallowed tool: ${tool}` };
  }
  if (!Array.isArray(args) || !args.every((a) => typeof a === 'string')) {
    return { ok: false, error: 'Invalid arguments' };
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child;
    try {
      child = spawn(bin, args, { shell: false });
    } catch (err) {
      resolve({ ok: false, error: `Failed to launch ${bin}: ${err.message}` });
      return;
    }

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => {
      resolve({
        ok: false,
        error: `${bin} not found or failed to run. Is it installed and on PATH? (${err.message})`,
      });
    });

    child.on('close', (code) => {
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
});

// --- MiRAi: AI assistant ---
const keyFilePath = () => path.join(app.getPath('userData'), 'mirai.key');

ipcMain.handle('mirai:setKey', async (_event, apiKey) => {
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, error: 'OS-level secure storage is unavailable on this machine.' };
  }
  const encrypted = safeStorage.encryptString(apiKey);
  fs.writeFileSync(keyFilePath(), encrypted);
  return { ok: true };
});

ipcMain.handle('mirai:hasKey', async () => {
  return fs.existsSync(keyFilePath());
});

ipcMain.handle('mirai:clearKey', async () => {
  if (fs.existsSync(keyFilePath())) fs.unlinkSync(keyFilePath());
  return { ok: true };
});

function loadApiKey() {
  if (!fs.existsSync(keyFilePath())) return null;
  const encrypted = fs.readFileSync(keyFilePath());
  return safeStorage.decryptString(encrypted);
}

const MIRAI_SYSTEM_PROMPT =
  'You are MiRAi, a terse, knowledgeable network-engineering assistant embedded in a terminal app called Mnetto. Prefer short, direct, technically precise answers.';

function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

ipcMain.handle('mirai:ask', async (_event, { messages, model }) => {
  const apiKey = loadApiKey();
  if (!apiKey) {
    return { ok: false, error: 'No API key set. Run: mirai key <your-api-key>' };
  }

  const modelName = model || 'gemini-2.5-flash-lite';

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: MIRAI_SYSTEM_PROMPT }] },
          contents: toGeminiContents(messages),
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `API error (${res.status})` };
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: `Request failed: ${err.message}` };
  }
});

// --- Folder backup ---
const MAX_UPLOAD_FILE_BYTES = 45 * 1024 * 1024;

ipcMain.handle('folder:pick', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select the folder to back up',
  });
  if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true };
  return { ok: true, folderPath: result.filePaths[0] };
});

function walkFiles(dir, baseDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      files.push({ fullPath, relativePath: path.relative(baseDir, fullPath).replace(/\\/g, '/') });
    }
  }
  return files;
}

ipcMain.handle('folder:read', async (_event, folderPath) => {
  try {
    const found = walkFiles(folderPath, folderPath);
    const files = [];
    const skipped = [];

    for (const { fullPath, relativePath } of found) {
      const stat = fs.statSync(fullPath);
      if (stat.size > MAX_UPLOAD_FILE_BYTES) {
        skipped.push({ relativePath, reason: `too large (${(stat.size / 1024 / 1024).toFixed(1)}MB, limit 45MB)` });
        continue;
      }
      const bytes = fs.readFileSync(fullPath);
      files.push({ relativePath, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), size: stat.size });
    }

    return { ok: true, files, skipped };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ============================================================
// NEW: TRACKER IPC HANDLERS
// ============================================================
ipcMain.handle('tracker:start', async () => {
  startTracker(supabase);
  return { ok: true };
});

ipcMain.handle('tracker:stop', async () => {
  stopTracker();
  return { ok: true };
});

ipcMain.handle('tracker:status', async () => {
  return getStatus();
});

ipcMain.handle('tracker:collect', async () => {
  const data = await collectAllData();
  return { ok: true, data };
});

ipcMain.handle('tracker:flushCache', async () => {
  const cached = getCachedData();
  let uploaded = 0;
  for (const item of cached) {
    try {
      await reportToSupabase(supabase, item);
      uploaded++;
    } catch (err) {
      console.error('Failed to upload cached item:', err);
    }
  }
  clearCachedData();
  return { ok: true, uploaded, total: cached.length };
});
