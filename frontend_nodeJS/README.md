# 🔬 Network Scanner

A Node.js application for pinging IP ranges and extracting detailed device information via SSH.

---

## Features

- **Phase 1 – Ping Scan**: Accepts single IPs, ranges, or CIDR blocks. Pings all IPs concurrently and returns alive/dead lists.
- **Phase 2 – Device Info**: SSH into alive hosts using credentials and extract comprehensive device details (OS, CPU, RAM, disk, network, ports, processes, etc.)
- **Real-time progress** via Socket.IO
- **Web UI** with terminal aesthetic
- **Export** results as JSON or CSV

---

## Installation

```bash
cd network-scanner
npm install
```

> Requires Node.js v16+

---

## Usage

```bash
npm start
```

Open **http://localhost:3000** in your browser.

---

## API Reference

### POST `/api/scan`
Ping a set of IPs.

**Request body:**
```json
{
  "input": "192.168.1.0/24",
  "socketId": "optional-socket-id-for-realtime"
}
```

**IP Input formats supported:**
| Format | Example |
|--------|---------|
| Single IP | `192.168.1.1` |
| Range | `192.168.1.1-192.168.1.100` |
| CIDR | `192.168.1.0/24` |
| Comma-separated | `10.0.0.1, 192.168.0.0/28` |

**Response:**
```json
{
  "total": 254,
  "success": ["192.168.1.1", "192.168.1.5"],
  "failed": ["192.168.1.2", "..."],
  "details": [{ "ip": "192.168.1.1", "alive": true, "time": 12 }]
}
```

---

### POST `/api/device-info`
Extract device information from multiple hosts via SSH.

**Request body:**
```json
{
  "hosts": [
    { "ip": "192.168.1.1", "username": "root", "password": "secret", "port": 22 }
  ],
  "socketId": "optional-socket-id"
}
```

**Response:**
```json
{
  "results": [
    {
      "ip": "192.168.1.1",
      "status": "success",
      "parsed": {
        "hostname": "server01",
        "os": "Linux server01 5.15.0-1...",
        "kernel": "5.15.0-1",
        "architecture": "x86_64",
        "cpu": "Intel(R) Core(TM) i7-...",
        "cpu_cores": "8",
        "memory": { "total": "16G", "used": "4.2G" },
        "uptime": "up 3 days, 4 hours",
        "network_interfaces": [
          { "name": "eth0", "ipv4": "192.168.1.1", "ipv6": "fe80::..." }
        ],
        "mac_addresses": ["aa:bb:cc:dd:ee:ff"],
        "disks": [
          { "source": "/dev/sda1", "size": "100G", "used": "22G", "avail": "73G", "use_pct": "24%", "mount": "/" }
        ],
        "open_ports": "...",
        "top_processes": "...",
        "active_users": "...",
        "last_logins": "..."
      },
      "raw": { "hostname": "...", "cpu": "...", "..." : "..." }
    }
  ]
}
```

---

### POST `/api/device-info/single`
Extract from a single host.

```json
{ "ip": "192.168.1.1", "username": "root", "password": "secret", "port": 22 }
```

---

## Web UI Features

| Feature | Description |
|---------|-------------|
| **Ping Scan** tab | Enter IPs, watch real-time ping progress |
| **Device Info** tab | Add credentials manually or via CSV |
| **Import from Scan** | Auto-populate credentials from alive hosts |
| **Export JSON** | Full raw + parsed results |
| **Export CSV** | Summary spreadsheet |

---

## Device Info Collected

| Category | Fields |
|----------|--------|
| System | Hostname, OS, kernel, architecture, uptime, timezone |
| Hardware | CPU model, core count, RAM total/used, hardware model, BIOS |
| Network | Interface names, IPv4, IPv6, MAC addresses |
| Storage | Mount points, sizes, used/available space |
| Security | Open ports, active users, last 10 logins |
| Processes | Top CPU-consuming processes |
| Packages | Count of installed packages |

---

## Notes

- SSH must be enabled on target hosts
- Some commands (BIOS info, hardware model) require sudo privileges
- Supports Linux/Unix targets; Windows hosts would require WinRM (not included)
- Maximum 1024 IPs per ping scan
- SSH connections are batched (5 concurrent) to avoid resource exhaustion
