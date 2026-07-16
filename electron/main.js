import { app, BrowserWindow, ipcMain, safeStorage, dialog } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

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

/**
 * --- Auto-update ---
 *
 * Checks GitHub Releases (configured via electron-builder's "publish" field
 * in package.json) for a newer version, downloads it in the background,
 * and prompts the user to restart once it's ready. Disabled in dev mode —
 * there's no packaged app to update when running via `npm run dev`.
 */
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
    // Update failures should never crash or block the app — just log it.
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

/**
 * Whitelist of external tools this app is allowed to shell out to.
 * NEVER pass raw user strings straight into spawn — always split into
 * a fixed binary + an argument array. This is what keeps a "run this
 * command" text box from becoming a shell-injection hole.
 */
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

/**
 * --- MiRAi: the built-in AI assistant, backed by the free-tier Google Gemini API ---
 *
 * The API key is encrypted at rest using Electron's safeStorage (which
 * defers to the OS keychain: Keychain on macOS, DPAPI on Windows, libsecret
 * on Linux). It's stored in the app's userData folder, NOT bundled into the
 * app, and NEVER sent anywhere except directly to generativelanguage.googleapis.com.
 */
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

/** Converts our {role: 'user'|'assistant', content: string}[] history into Gemini's {role, parts} format. */
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

/**
 * --- Folder backup (jobsheets/assignments -> Supabase Storage) ---
 *
 * Desktop-only, since it needs real filesystem access to pick and read an
 * arbitrary folder — something Android's WebView and a website can't do.
 * This side only picks the folder and reads the raw file bytes; the actual
 * upload to Supabase happens in the renderer (src/lib/cloud.js), since
 * that's where the signed-in Supabase session already lives.
 */
const MAX_UPLOAD_FILE_BYTES = 45 * 1024 * 1024; // stay under Supabase's default 50MB/file limit

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
