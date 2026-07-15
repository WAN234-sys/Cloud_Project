import { useEffect, useRef, useState } from 'react';
import { runCommand } from '../lib/commands.js';
import { checkForUpdate } from '../lib/updateCheck.js';

const BANNER = `Mnetto v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'} — subnet calc / nmap / ping / MiRAi
Type "help" to see available commands.`;

export default function Terminal() {
  const [lines, setLines] = useState([{ type: 'banner', text: BANNER }]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Quiet check on launch — only says anything if there's actually an
    // update, so this never adds noise for people already on the latest version.
    checkForUpdate().then((result) => {
      if (result.updateAvailable) {
        const text = window.netkit
          ? `A new version is available: ${result.currentVersion} -> ${result.latestVersion}. It's downloading in the background — you'll be prompted to restart once it's ready.`
          : `A new version is available: ${result.currentVersion} -> ${result.latestVersion}. Download: ${result.url}`;
        setLines((l) => [...l, { type: 'output', text }]);
      }
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    const value = input;
    setInput('');
    if (!value.trim()) return;

    setHistory((h) => [...h, value]);
    setHistoryIndex(null);
    setLines((l) => [...l, { type: 'command', text: value }]);
    setBusy(true);

    // 1. Figure out what command the user typed
    const commandName = value.trim().split(' ')[0].toLowerCase();
    const desktopOnlyCommands = ['nmap', 'ping'];

    let results;

    // 2. Intercept desktop-only binaries if window.electronAPI doesn't exist (e.g., on Android)
    if (desktopOnlyCommands.includes(commandName) && !window.electronAPI) {
      results = [{ 
        type: 'output', 
        text: `Error: The "${commandName}" command is only supported on the Desktop version.` 
      }];
    } else {
      // Otherwise, let the normal command engine execute it safely
      results = await runCommand(value);
    }

    setBusy(false);

    if (results.some((r) => r.type === 'clear')) {
      setLines([{ type: 'banner', text: BANNER }]);
      return;
    }
    setLines((l) => [...l, ...results]);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    }
  }

  return (
    <div className="terminal-shell" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-titlebar">
        <div className="dots">
          <span className="dot dot-red" />
          <span className="dot dot-amber" />
          <span className="dot dot-green" />
        </div>
        <span className="titlebar-label">mnetto — network toolkit</span>
      </div>

      <div className="terminal-scroll" ref={scrollRef}>
        {lines.map((line, i) => (
          <div key={i} className={`line line-${line.type}`}>
            {line.type === 'command' ? (
              <>
                <span className="prompt">netkit#</span> {line.text}
              </>
            ) : (
              <pre>{line.text}</pre>
            )}
          </div>
        ))}
        {busy && <div className="line line-output"><pre className="pulse">running…</pre></div>}

        <form onSubmit={submit} className="input-row">
          <span className="prompt">netkit#</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}