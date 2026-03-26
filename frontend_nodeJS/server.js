/**
 * server.js
 * Express + Socket.IO server that orchestrates:
 *  1. IP ping scanning
 *  2. SSH-based device info extraction
 */

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");

const { parseIpInput } = require("./ipUtils");
const { scanIps } = require("./pingScanner");
const {
  extractMultiple,
  extractWindowsSoftware,
  testWindowsCredentials,
} = require("./deviceInfo");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve files from current directory

// ─── REST API ─────────────────────────────────────────────────────────────────

/**
 * POST /api/scan
 * Body: { input: "192.168.1.0/24" }
 * Streams progress via Socket.IO event "scan:progress"
 * Returns final result.
 */
app.post("/api/scan", async (req, res) => {
  const { input, socketId } = req.body;
  if (!input) return res.status(400).json({ error: "input is required" });

  let ips;
  try {
    ips = parseIpInput(input);
  } catch (err) {
    return res.status(400).json({ error: `Invalid IP input: ${err.message}` });
  }

  if (ips.length === 0)
    return res.status(400).json({ error: "No IPs parsed from input" });
  if (ips.length > 1024)
    return res.status(400).json({ error: "Maximum 1024 IPs per scan" });

  const socket = socketId ? io.sockets.sockets.get(socketId) : null;

  const onProgress = (progress) => {
    if (socket) socket.emit("scan:progress", progress);
  };

  try {
    const result = await scanIps(ips, onProgress);
    if (socket) socket.emit("scan:done", result);
    res.json({ total: ips.length, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/device-info
 * Body: {
 *   hosts: [{ ip, username, password, port?, osType?, method? }],
 *   socketId: "..."
 * }
 * osType: "windows" | "linux" | "mac" | "network" | "auto" (default: "auto")
 * method: "powershell" | "wmi" | "wmic" (for Windows only, default: "powershell")
 */
app.post("/api/device-info", async (req, res) => {
  const { hosts, socketId } = req.body;
  if (!Array.isArray(hosts) || hosts.length === 0) {
    return res.status(400).json({ error: "hosts array is required" });
  }

  const socket = socketId ? io.sockets.sockets.get(socketId) : null;

  const onProgress = (progress) => {
    if (socket) socket.emit("device:progress", progress);
  };

  try {
    const results = await extractMultiple(hosts, onProgress);
    if (socket) socket.emit("device:done", results);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/device-info/single
 * Body: { ip, username, password, port?, osType?, method? }
 * osType: "windows" | "linux" | "mac" | "network" | "auto" (default: "auto")
 * method: "powershell" | "wmi" | "wmic" (for Windows only, default: "powershell")
 */
app.post("/api/device-info/single", async (req, res) => {
  const { ip, username, password, port, osType, method } = req.body;
  if (!ip || !username || !password) {
    return res
      .status(400)
      .json({ error: "ip, username, and password are required" });
  }
  const { extractDeviceInfo } = require("./deviceInfo");
  try {
    const result = await extractDeviceInfo({
      ip,
      username,
      password,
      port,
      osType: osType || "auto",
      method: method || "powershell",
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/software-info
 * Extract software information from Windows hosts using OS-specific scripts
 * Body: { ip, username, password }
 */
app.post("/api/software-info", async (req, res) => {
  const { ip, username, password } = req.body;
  if (!ip || !username || !password) {
    return res
      .status(400)
      .json({ error: "ip, username, and password are required" });
  }

  try {
    // First test credentials and detect OS
    console.log(`[Software] Testing credentials for ${ip}...`);
    const windowsTest = await testWindowsCredentials(ip, username, password);

    if (!windowsTest.success) {
      return res.status(401).json({
        error: "Windows authentication failed",
        details: windowsTest.error,
      });
    }

    // Extract software using appropriate script
    console.log(
      `[Software] Extracting software for ${ip} (${windowsTest.os})...`,
    );
    const result = await extractWindowsSoftware(
      ip,
      username,
      password,
      windowsTest.os,
    );

    if (result.status === "success") {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/test-connection
 * Test Windows connection and detect OS version
 * Body: { ip, username, password }
 */
app.post("/api/test-connection", async (req, res) => {
  const { ip, username, password } = req.body;
  if (!ip || !username || !password) {
    return res
      .status(400)
      .json({ error: "ip, username, and password are required" });
  }

  try {
    const result = await testWindowsCredentials(ip, username, password);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 1000;
server.listen(PORT, () => {
  console.log(`\n🚀 Network Scanner running at http://localhost:${PORT}\n`);
});
