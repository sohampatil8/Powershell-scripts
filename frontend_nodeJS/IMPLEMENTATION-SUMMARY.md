# OS-Based Script Execution - Implementation Summary

## ✅ What Was Added

### 1. **New Files Created**

- `OS-DETECTION-README.md` - Complete documentation
- `test-os-detection.js` - Command-line test script
- `test-os-ui.html` - Web-based test interface

### 2. **Modified Files**

#### `deviceInfo.js`

**New Functions:**

- `executeExternalScript()` - Executes external PowerShell scripts via Invoke-Command
- `extractWindowsInfo()` - Now uses OS-specific external scripts (Windows 7 vs Modern Windows)
- `extractWindowsSoftware()` - Extracts software info using appropriate script based on OS

**New Constants:**

```javascript
const SCRIPTS = {
  WIN7_HW: "Win7_hard.ps1", // Windows 7 hardware (Get-WmiObject)
  WIN7_SW: "Win7_sw.ps1", // Windows 7 software
  WIN11_HW: "W32_Remote_hw.ps1", // Modern Windows hardware (Get-CimInstance)
  WIN11_SW: "W32_Remote_sw.ps1", // Modern Windows software
};
```

**Updated Exports:**

```javascript
module.exports = {
  extractDeviceInfo,
  extractMultiple,
  testWindowsCredentials,
  executeExternalScript,
  extractWindowsSoftware,
};
```

#### `server.js`

**New API Endpoints:**

- `POST /api/test-connection` - Test connection and detect OS version
- `POST /api/software-info` - Extract software using OS-specific scripts

**Updated Endpoints:**

- `POST /api/device-info/single` - Now returns OS detection info

## 🔄 How It Works

### Workflow

```
1. Client sends request → Server
2. Server calls testWindowsCredentials()
3. Detects OS: "Windows 7" or "Modern Windows"
4. Selects appropriate script:
   - Windows 7 → Win7_hard.ps1 (uses Get-WmiObject)
   - Others → W32_Remote_hw.ps1 (uses Get-CimInstance)
5. Executes script via Invoke-Command
6. Returns structured JSON response
```

### Script Selection Logic

```javascript
const isWindows7 = osVersion && osVersion.toLowerCase().includes("windows 7");
const scriptPath = isWindows7 ? SCRIPTS.WIN7_HW : SCRIPTS.WIN11_HW;
```

## 🧪 Testing

### Method 1: Command Line Test

```bash
node test-os-detection.js <ip> <username> <password>
```

Example:

```bash
node test-os-detection.js 192.168.1.100 Administrator MyPass123
```

### Method 2: Web Interface

1. Start the server:

   ```bash
   npm start
   ```

2. Open in browser:

   ```
   http://localhost:1000/test-os-ui.html
   ```

3. Fill in credentials and click buttons to test

### Method 3: cURL

```bash
# Test connection
curl -X POST http://localhost:1000/api/test-connection \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.100","username":"Administrator","password":"pass123"}'

# Get hardware info
curl -X POST http://localhost:1000/api/device-info/single \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.100","username":"Administrator","password":"pass123"}'

# Get software info
curl -X POST http://localhost:1000/api/software-info \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.100","username":"Administrator","password":"pass123"}'
```

## 📊 API Response Examples

### Test Connection Response

```json
{
  "success": true,
  "os": "Microsoft Windows 10 Pro",
  "error": null
}
```

### Hardware Info Response

```json
{
  "ip": "192.168.1.100",
  "status": "success",
  "method": "windows-winrm",
  "os_detected": "Microsoft Windows 10 Pro",
  "parsed": {
    "hostname": "PC-001",
    "os": "Microsoft Windows 10 Pro",
    "os_detection": "Modern Windows",
    "script_used": "W32_Remote_hw.ps1",
    "manufacturer": "Dell Inc.",
    "cpu": "Intel Core i7",
    "memory": {"total": "16 GB"},
    ...
  }
}
```

### Software Info Response

```json
{
  "status": "success",
  "hostname": "PC-001",
  "os": "Microsoft Windows 10 Pro",
  "os_detection": "Modern Windows",
  "script_used": "W32_Remote_sw.ps1",
  "software_count": 125,
  "software": [
    {
      "Name": "Google Chrome",
      "Version": "120.0.6099.109",
      "Publisher": "Google LLC",
      "InstallDate": "20231215"
    },
    ...
  ]
}
```

## 🎯 Key Features

✅ **Automatic OS Detection** - Detects Windows version automatically
✅ **Script Selection** - Uses appropriate script (WMI vs CIM cmdlets)
✅ **Backward Compatible** - Works with Windows 7 and modern Windows
✅ **External Scripts** - Uses your existing PowerShell scripts
✅ **RESTful API** - Easy integration with front-end applications
✅ **Detailed Logging** - Console logs show which script is being used
✅ **Error Handling** - Comprehensive error messages

## 📁 File Structure

```
files/
├── server.js (Modified)
├── deviceInfo.js (Modified)
├── OS-DETECTION-README.md (New)
├── test-os-detection.js (New)
├── test-os-ui.html (New)
├── IMPLEMENTATION-SUMMARY.md (This file)
└── Powershell-scripts-main/
    ├── W32_Remote_hw.ps1 (Required)
    ├── W32_Remote_sw.ps1 (Required)
    ├── Win7_hard.ps1 (Required)
    └── Win7_sw.ps1 (Required)
```

## 🚀 Quick Start

1. **Ensure all PowerShell scripts are in place**

   ```
   Powershell-scripts-main/W32_Remote_hw.ps1
   Powershell-scripts-main/W32_Remote_sw.ps1
   Powershell-scripts-main/Win7_hard.ps1
   Powershell-scripts-main/Win7_sw.ps1
   ```

2. **Start the server**

   ```bash
   npm start
   ```

3. **Test the functionality**

   ```bash
   # Option A: Command line
   node test-os-detection.js 192.168.1.100 Administrator pass123

   # Option B: Web interface
   # Open: http://localhost:1000/test-os-ui.html
   ```

## 🔧 Configuration

If your scripts are in a different location, update `deviceInfo.js`:

```javascript
const POWERSHELL_SCRIPTS_DIR = path.join(__dirname, "your-scripts-folder");
```

## 📝 Notes

- **Windows 7 Scripts**: Use `Get-WmiObject` (older WMI cmdlets)
- **Modern Windows Scripts**: Use `Get-CimInstance` (newer CIM cmdlets)
- **Script Execution**: Via PowerShell's `Invoke-Command` with credentials
- **Remote Access**: Requires WinRM to be enabled on target machines

## 🐛 Troubleshooting

### Script not found

- Verify all 4 PowerShell scripts exist in `Powershell-scripts-main/`
- Check file names match exactly (case-sensitive)

### Access denied

- Verify user has administrator privileges
- Check WinRM is enabled: `winrm quickconfig`
- Verify trusted hosts: `Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*"`

### Connection timeout

- Check firewall allows WinRM (ports 5985/5986)
- Verify target machine is reachable
- Test with: `Test-WSMan <ip>`

## 💡 Next Steps

Consider adding:

- [ ] Credential caching for multiple scans
- [ ] Scheduled/periodic scanning
- [ ] Database storage for scan history
- [ ] Software version comparison/updates tracking
- [ ] CSV/Excel export functionality
- [ ] Multi-host batch scanning with progress bars

## 📚 Documentation

For detailed information, see:

- `OS-DETECTION-README.md` - Complete feature documentation
- `test-os-detection.js` - Example usage code
- `test-os-ui.html` - Interactive web interface

## ✅ Implementation Complete!

Your Node.js application now automatically detects the Windows OS version and executes the appropriate PowerShell scripts, just like the Main3.ps1 PowerShell script!
