import { calculateSubnet } from './subnetCalculator.js';
import { signInWithEmail, verifyEmailCode, getCurrentUser, signOut, saveSession, listSessions, isCloudConfigured, createTeam, joinTeam } from './cloud.js';

const HELP_TEXT = `Available commands:
  subnet <ip/cidr>       e.g. subnet 192.168.1.0/24
  ping <host>            uses the system ping binary
  nmap <args...>         e.g. nmap -sV 192.168.1.1  (requires nmap installed)
  scan <args...>         alias for nmap
  cloud login <email>    sign in for cloud sync (emails a 6-digit code)
  cloud verify <code>    complete sign-in with the code from your email
  cloud whoami           show who's signed in
  cloud logout           sign out
  cloud team create      create a shared team workspace, get an invite code
  cloud team join <code> join a teammate's workspace using their invite code (works globally, any device)
  cloud save             save the last subnet result (shared with your team, if on one)
  cloud history          list saved sessions (yours + your team's)
  mirai key <api-key>    store your free Gemini API key (encrypted, local only)
  mirai <question>       ask MiRAi, the built-in AI assistant
  clear                  clear the screen
  help                   show this message`;

// Keeps the last subnet result around so "cloud save" has something to save,
// and keeps MiRAi's short conversational memory for this session.
let lastSubnetResult = null;
let miraiHistory = [];
let pendingLoginEmail = null; // set by "cloud login", consumed by "cloud verify"

export async function runCommand(rawInput) {
  const input = rawInput.trim();
  if (!input) return [];

  const [cmd, ...rest] = input.split(/\s+/);
  const arg = rest.join(' ');
  const commandLower = cmd.toLowerCase();

  switch (commandLower) {
    case 'help':
      return [{ type: 'output', text: HELP_TEXT }];

    case 'clear':
      return [{ type: 'clear' }];

    case 'subnet': {
      if (!arg) return [{ type: 'error', text: 'Usage: subnet <ip/cidr>, e.g. subnet 10.0.0.0/8' }];
      try {
        const result = calculateSubnet(arg);
        lastSubnetResult = result;
        const lines = [
          `Network Address:   ${result.networkAddress}`,
          `Broadcast Address: ${result.broadcastAddress}`,
          `Subnet Mask:       ${result.subnetMask}`,
          `Wildcard Mask:     ${result.wildcardMask}`,
          `Usable Host Range: ${result.firstUsable} - ${result.lastUsable}`,
          `Total / Usable:    ${result.totalHosts} / ${result.usableHosts}`,
          '',
          '--- how it was calculated ---',
          ...result.trace,
        ];
        return [{ type: 'output', text: lines.join('\n') }];
      } catch (err) {
        return [{ type: 'error', text: err.message }];
      }
    }

    case 'ping': {
      if (!arg) return [{ type: 'error', text: 'Usage: ping <host>' }];
      
      // Graceful platform check for Android/Web fallback
      if (!window.netkit) {
        return [{ type: 'error', text: `The "${commandLower}" command is only supported on the Desktop version of Mnetto.` }];
      }

      const countFlag = window.navigator.platform.includes('Win') ? '-n' : '-c';
      const res = await window.netkit.runTool('ping', [countFlag, '4', arg]);
      return [{ type: res.ok ? 'output' : 'error', text: res.stdout || res.stderr || res.error }];
    }

    case 'nmap':
    case 'scan': {
      if (!arg) return [{ type: 'error', text: 'Usage: nmap <args> <target>, e.g. nmap -sV 192.168.1.1' }];
      
      // Graceful platform check for Android/Web fallback
      if (!window.netkit) {
        return [{ type: 'error', text: `The "${commandLower}" command is only supported on the Desktop version of Mnetto.` }];
      }

      const res = await window.netkit.runTool('nmap', rest);
      return [{ type: res.ok ? 'output' : 'error', text: res.stdout || res.stderr || res.error }];
    }

    case 'cloud': {
      const [sub, ...subArgs] = rest;
      if (!isCloudConfigured()) {
        return [{ type: 'error', text: 'Cloud storage isn\'t configured yet. See README "Cloud storage setup".' }];
      }
      try {
        switch (sub) {
          case 'login': {
            const email = subArgs[0];
            if (!email) return [{ type: 'error', text: 'Usage: cloud login <email>' }];
            await signInWithEmail(email);
            pendingLoginEmail = email;
            return [{ type: 'output', text: `6-digit code sent to ${email}. Run: cloud verify <code>` }];
          }
          case 'verify': {
            const code = subArgs[0];
            if (!code) return [{ type: 'error', text: 'Usage: cloud verify <code>' }];
            if (!pendingLoginEmail) return [{ type: 'error', text: 'Run "cloud login <email>" first.' }];
            await verifyEmailCode(pendingLoginEmail, code);
            pendingLoginEmail = null;
            return [{ type: 'output', text: 'Signed in. Run "cloud whoami" to confirm.' }];
          }
          case 'whoami': {
            const user = await getCurrentUser();
            return [{ type: 'output', text: user ? `Signed in as ${user.email}` : 'Not signed in.' }];
          }
          case 'logout': {
            await signOut();
            return [{ type: 'output', text: 'Signed out.' }];
          }
          case 'team': {
            const [teamAction, teamArg] = subArgs;
            if (teamAction === 'create') {
              const code = await createTeam();
              return [{ type: 'output', text: `Team created. Invite code: ${code}\nShare this with anyone, anywhere — they run: cloud team join ${code}` }];
            }
            if (teamAction === 'join') {
              if (!teamArg) return [{ type: 'error', text: 'Usage: cloud team join <invite-code>' }];
              await joinTeam(teamArg);
              return [{ type: 'output', text: `Joined the team. "cloud save" and "cloud history" now include your team's shared data, from any device.` }];
            }
            return [{ type: 'error', text: 'Usage: cloud team <create|join <code>>' }];
          }
          case 'save': {
            if (!lastSubnetResult) return [{ type: 'error', text: 'Nothing to save yet — run a subnet calculation first.' }];
            await saveSession('subnet', lastSubnetResult);
            return [{ type: 'output', text: `Saved ${lastSubnetResult.input} to the cloud.` }];
          }
          case 'history': {
            const sessions = await listSessions();
            if (sessions.length === 0) return [{ type: 'output', text: 'No saved sessions yet.' }];
            const lines = sessions.map((s) => `[${s.kind}] ${new Date(s.created_at).toLocaleString()} — ${JSON.stringify(s.payload).slice(0, 80)}`);
            return [{ type: 'output', text: lines.join('\n') }];
          }
          default:
            return [{ type: 'error', text: 'Usage: cloud <login|verify|whoami|logout|team|save|history>' }];
        }
      } catch (err) {
        return [{ type: 'error', text: err.message }];
      }
    }

    case 'mirai': {
      const [sub, ...subArgs] = rest;

      // --- 1. HANDLE SAVING THE API KEY ---
      if (sub === 'key') {
        const key = subArgs[0];
        if (!key) return [{ type: 'error', text: 'Usage: mirai key <your-gemini-api-key>' }];
        
        if (window.netkit) {
          // Desktop: Save securely via Electron
          const res = await window.netkit.setApiKey(key);
          return [{ type: res.ok ? 'output' : 'error', text: res.ok ? 'API key saved securely on Desktop.' : res.error }];
        } else {
          // Mobile/Browser Fallback: Save to device localStorage
          localStorage.setItem('mnetto_mirai_key', key);
          return [{ type: 'output', text: 'API key saved locally on mobile device.' }];
        }
      }

      // --- 2. HANDLE CLEARING THE API KEY ---
      if (sub === 'clear-key') {
        if (window.netkit) {
          await window.netkit.clearApiKey();
        } else {
          localStorage.removeItem('mnetto_mirai_key');
        }
        miraiHistory = [];
        return [{ type: 'output', text: 'API key removed.' }];
      }

      if (!arg) return [{ type: 'error', text: 'Usage: mirai <question>, or: mirai key <api-key>' }];

      // --- 3. CHECK IF API KEY EXISTS ---
      let hasKey = false;
      let apiKey = '';
      
      if (window.netkit) {
        hasKey = await window.netkit.hasApiKey();
      } else {
        apiKey = localStorage.getItem('mnetto_mirai_key');
        hasKey = !!apiKey;
      }

      if (!hasKey) {
        return [{ type: 'error', text: 'No API key set yet. Get a free key at aistudio.google.com/apikey, then run: mirai key <your-key>' }];
      }

      // --- 4. EXECUTE THE AI CHAT ---
      miraiHistory.push({ role: 'user', content: arg });

      if (window.netkit) {
        // Desktop Mode: Route through safe Electron main process context
        const res = await window.netkit.askMirai(miraiHistory);
        if (!res.ok) {
          miraiHistory.pop();
          return [{ type: 'error', text: res.error }];
        }
        miraiHistory.push({ role: 'assistant', content: res.text });
        if (miraiHistory.length > 20) miraiHistory = miraiHistory.slice(-20);
        return [{ type: 'output', text: `MiRAi: ${res.text}` }];
      } else {
        // Web/Mobile-browser mode: request directly via browser fetch.
        // Gemini's REST API supports CORS from browsers with just an API
        // key header — no proxy needed, same "bring your own key" pattern:
        // each visitor's key stays in their own browser only.
        try {
          const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
            {
              method: 'POST',
              headers: {
                'x-goog-api-key': apiKey,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                system_instruction: {
                  parts: [{
                    text: 'You are MiRAi, a terse, knowledgeable network-engineering assistant embedded in a terminal app called Mnetto. Prefer short, direct, technically precise answers.',
                  }],
                },
                contents: miraiHistory.map((m) => ({
                  role: m.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: m.content }],
                })),
              }),
            }
          );

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error?.message || `API error (${response.status})`);
          }

          const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';

          miraiHistory.push({ role: 'assistant', content: aiResponse });
          if (miraiHistory.length > 20) miraiHistory = miraiHistory.slice(-20);
          return [{ type: 'output', text: `MiRAi: ${aiResponse}` }];
        } catch (err) {
          miraiHistory.pop();
          return [{ type: 'error', text: `MiRAi error: ${err.message}` }];
        }
      }
    }

    default:
      return [{ type: 'error', text: `Unknown command: ${cmd}. Type "help" for a list.` }];
  }
}