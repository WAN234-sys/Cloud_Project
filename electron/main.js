import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#0b0f0d',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
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
 * --- MiRAi: the built-in AI assistant, backed by the real Claude API ---
 *
 * The API key is encrypted at rest using Electron's safeStorage (which
 * defers to the OS keychain: Keychain on macOS, DPAPI on Windows, libsecret
 * on Linux). It's stored in the app's userData folder, NOT bundled into the
 * app, and NEVER sent anywhere except directly to api.anthropic.com.
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

ipcMain.handle('mirai:ask', async (_event, { messages, model }) => {
  const apiKey = loadApiKey();
  if (!apiKey) {
    return { ok: false, error: 'No API key set. Run: mirai key <your-api-key>' };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:
          'You are MiRAi, a terse, knowledgeable network-engineering assistant embedded in a terminal app called NetKit. Prefer short, direct, technically precise answers.',
        messages,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `API error (${res.status})` };
    }
    const text = data.content?.find((b) => b.type === 'text')?.text || '(no response)';
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: `Request failed: ${err.message}` };
  }
});
