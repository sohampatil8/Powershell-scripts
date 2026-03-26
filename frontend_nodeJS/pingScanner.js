/**
 * pingScanner.js
 * Pings a list of IPs concurrently (batched) and returns success/failed lists.
 * Emits real-time progress via a callback.
 */

const ping = require("ping");
const os = require("os");

const BATCH_SIZE = 20; // How many pings to fire simultaneously
const PING_TIMEOUT = 3; // seconds

// Detect platform for proper ping flags
const isWindows = os.platform() === "win32";

/**
 * Ping a single IP.
 * @returns {{ ip, alive, time }}
 */
async function pingOne(ip) {
  try {
    const config = {
      timeout: PING_TIMEOUT,
      min_reply: 1,
    };

    // Windows uses different flags
    if (isWindows) {
      config.extra = ["-n", "1"]; // Windows: -n for count
    } else {
      config.extra = ["-c", "1"]; // Linux/Mac: -c for count
    }

    const res = await ping.promise.probe(ip, config);
    return {
      ip,
      alive: res.alive,
      time: res.time === "unknown" ? null : res.time,
    };
  } catch (err) {
    console.error(`Ping error for ${ip}:`, err.message);
    return { ip, alive: false, time: null };
  }
}

/**
 * Ping all IPs, batched for performance.
 *
 * @param {string[]} ips
 * @param {(progress: object) => void} onProgress  - called after each batch
 * @returns {{ success: string[], failed: string[], details: object[] }}
 */
async function scanIps(ips, onProgress) {
  const success = [];
  const failed = [];
  const details = [];
  let scanned = 0;

  for (let i = 0; i < ips.length; i += BATCH_SIZE) {
    const batch = ips.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(pingOne));

    for (const r of results) {
      details.push(r);
      if (r.alive) {
        success.push(r.ip);
      } else {
        failed.push(r.ip);
      }
    }

    scanned += batch.length;
    if (onProgress) {
      onProgress({
        scanned,
        total: ips.length,
        percent: Math.round((scanned / ips.length) * 100),
        latestBatch: results,
      });
    }
  }

  return { success, failed, details };
}

module.exports = { scanIps };
