/**
 * ipUtils.js
 * Parses single IPs, IP ranges (192.168.1.1-192.168.1.50),
 * and CIDR notation (192.168.1.0/24) into a flat array of IP strings.
 */

function ipToLong(ip) {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function longToIp(long) {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join(".");
}

function cidrToIps(cidr) {
  const [base, prefix] = cidr.split("/");
  const prefixLen = parseInt(prefix, 10);
  const mask = ~((1 << (32 - prefixLen)) - 1) >>> 0;
  const network = ipToLong(base) & mask;
  const broadcast = network | (~mask >>> 0);
  const ips = [];
  // Skip network and broadcast addresses
  for (let i = network + 1; i < broadcast; i++) {
    ips.push(longToIp(i));
  }
  return ips;
}

function rangeToIps(start, end) {
  const startLong = ipToLong(start);
  const endLong = ipToLong(end);
  const ips = [];
  for (let i = startLong; i <= endLong; i++) {
    ips.push(longToIp(i));
  }
  return ips;
}

function parseIpInput(input) {
  const entries = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allIps = [];

  for (const entry of entries) {
    if (entry.includes("/")) {
      allIps.push(...cidrToIps(entry));
    } else if (entry.includes("-")) {
      const [start, end] = entry.split("-").map((s) => s.trim());
      allIps.push(...rangeToIps(start, end));
    } else {
      allIps.push(entry);
    }
  }

  return [...new Set(allIps)];
}

module.exports = { parseIpInput };
