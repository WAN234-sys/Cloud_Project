// Subnet math, from first principles — this is the "how it calculates" part.

function ipToInt(ip) {
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function intToIp(int) {
  return [24, 16, 8, 0].map((shift) => (int >>> shift) & 255).join('.');
}

function maskFromPrefix(prefix) {
  if (prefix < 0 || prefix > 32) throw new Error(`Invalid CIDR prefix: /${prefix}`);
  // A /prefix mask is `prefix` 1-bits followed by (32-prefix) 0-bits.
  // >>> 0 forces this back into an unsigned 32-bit int in JS.
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/**
 * Parses "192.168.1.10/24" and returns every derived value, plus a
 * human-readable trace of how each one was calculated.
 */
export function calculateSubnet(cidrInput) {
  const [ipStr, prefixStr] = cidrInput.trim().split('/');
  if (!ipStr || prefixStr === undefined) {
    throw new Error('Expected format: 192.168.1.0/24');
  }
  const prefix = Number(prefixStr);
  const ipInt = ipToInt(ipStr);
  const mask = maskFromPrefix(prefix);

  const networkInt = (ipInt & mask) >>> 0;
  const broadcastInt = (networkInt | (~mask >>> 0)) >>> 0;
  const totalHosts = 2 ** (32 - prefix);
  const usableHosts = prefix >= 31 ? 0 : totalHosts - 2;

  const firstUsable = prefix >= 31 ? networkInt : networkInt + 1;
  const lastUsable = prefix >= 31 ? broadcastInt : broadcastInt - 1;

  return {
    input: cidrInput,
    ipAddress: intToIp(ipInt),
    prefix,
    subnetMask: intToIp(mask),
    wildcardMask: intToIp(~mask >>> 0),
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstUsable: intToIp(firstUsable),
    lastUsable: intToIp(lastUsable),
    totalHosts,
    usableHosts,
    trace: [
      `1. Convert ${ipStr} to 32-bit binary, and build a /${prefix} mask: ${prefix} one-bits then ${32 - prefix} zero-bits.`,
      `2. Subnet mask in dotted decimal: ${intToIp(mask)}`,
      `3. Network address = IP AND mask = ${intToIp(networkInt)}`,
      `4. Wildcard mask = NOT mask = ${intToIp(~mask >>> 0)}`,
      `5. Broadcast address = network OR wildcard = ${intToIp(broadcastInt)}`,
      `6. Total addresses = 2^(32-${prefix}) = ${totalHosts}; usable hosts = total − 2 (network + broadcast reserved) = ${usableHosts}`,
      `7. Usable host range = ${intToIp(firstUsable)} – ${intToIp(lastUsable)}`,
    ],
  };
}
