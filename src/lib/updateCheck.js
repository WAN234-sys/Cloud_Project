const REPO = 'WAN234-sys/Mnetto';

/** Compares two "1.2.3"-style version strings. Returns true if `latest` is newer than `current`. */
function isNewer(latest, current) {
  const a = latest.replace(/^v/, '').split('.').map(Number);
  const b = current.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/**
 * Checks GitHub's latest release against the version baked into this build
 * (see vite.config.js — __APP_VERSION__ comes from package.json at build time).
 *
 * On desktop, electron-updater already handles real auto-update — this is
 * mainly for Android and web, which have no other update mechanism at all
 * (Android can't silently self-update outside the Play Store; web always
 * serves the latest build on every page load, so this mostly just confirms
 * that for peace of mind).
 */
export async function checkForUpdate() {
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    const data = await res.json();
    const latestVersion = data.tag_name;

    if (latestVersion && isNewer(latestVersion, currentVersion)) {
      return {
        updateAvailable: true,
        currentVersion,
        latestVersion,
        url: data.html_url,
      };
    }
    return { updateAvailable: false, currentVersion, latestVersion };
  } catch (err) {
    return { updateAvailable: false, currentVersion, error: err.message };
  }
}
