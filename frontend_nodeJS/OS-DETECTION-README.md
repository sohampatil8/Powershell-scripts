# OS-Based Script Execution Feature

## Overview

Your Node.js application now automatically detects the Windows OS version and executes the appropriate PowerShell script for hardware and software information extraction.

## How It Works

### 1. **OS Detection**

When you connect to a Windows host, the application:

- Tests credentials using `testWindowsCredentials()`
- Automatically detects the Windows OS version (e.g., "Microsoft Windows 7 Professional", "Microsoft Windows 10 Pro")
- Returns the detected OS in the response

### 2. **Script Selection**

Based on the detected OS:

| OS Type              | Hardware Script     | Software Script     |
| -------------------- | ------------------- | ------------------- |
| **Windows 7**        | `Win7_hard.ps1`     | `Win7_sw.ps1`       |
| **Windows 8/10/11+** | `W32_Remote_hw.ps1` | `W32_Remote_sw.ps1` |

**Key Difference:**

- Windows 7 scripts use `Get-WmiObject` (older WMI cmdlets)
- Modern Windows scripts use `Get-CimInstance` (newer CIM cmdlets)

### 3. **Script Execution**

The scripts are executed on the remote host using PowerShell's `Invoke-Command` with the provided credentials.

## API Endpoints

### 1. Test Connection & Detect OS

```http
POST /api/test-connection
Content-Type: application/json

{
  "ip": "192.168.1.100",
  "username": "Administrator",
  "password": "your-password"
}
```

**Response:**

```json
{
  "success": true,
  "os": "Microsoft Windows 10 Pro",
  "error": null
}
```

### 2. Extract Hardware Information

```http
POST /api/device-info/single
Content-Type: application/json

{
  "ip": "192.168.1.100",
  "username": "Administrator",
  "password": "your-password",
  "port": 22
}
```

**Response includes:**

```json
{
  "ip": "192.168.1.100",
  "status": "success",
  "method": "windows-winrm",
  "os_detected": "Microsoft Windows 10 Pro",
  "parsed": {
    "hostname": "PC-001",
    "os": "Microsoft Windows 10 Pro",
    "manufacturer": "Dell Inc.",
    "model": "OptiPlex 7050",
    "cpu": "Intel(R) Core(TM) i7-7700...",
    "memory": { "total": "16 GB" },
    "os_detection": "Modern Windows",
    "script_used": "W32_Remote_hw.ps1",
    ...
  }
}
```

### 3. Extract Software Information

```http
POST /api/software-info
Content-Type: application/json

{
  "ip": "192.168.1.100",
  "username": "Administrator",
  "password": "your-password"
}
```

**Response:**

```json
{
  "status": "success",
  "hostname": "PC-001",
  "os": "Microsoft Windows 10 Pro",
  "software": [
    {
      "Name": "Google Chrome",
      "Version": "120.0.6099.109",
      "Publisher": "Google LLC",
      "InstallDate": "20231215"
    },
    ...
  ],
  "software_count": 125,
  "os_detection": "Modern Windows",
  "script_used": "W32_Remote_sw.ps1"
}
```

### 4. Batch Device Info Extraction

```http
POST /api/device-info
Content-Type: application/json

{
  "hosts": [
    {
      "ip": "192.168.1.100",
      "username": "Administrator",
      "password": "pass1"
    },
    {
      "ip": "192.168.1.101",
      "username": "Admin",
      "password": "pass2"
    }
  ],
  "socketId": "optional-socket-id-for-progress"
}
```

## Script Configuration

The PowerShell scripts are located in the `Powershell-scripts-main` directory:

```
Powershell-scripts-main/
├── W32_Remote_hw.ps1    # Hardware info for Windows 8/10/11+
├── W32_Remote_sw.ps1    # Software info for Windows 8/10/11+
├── Win7_hard.ps1        # Hardware info for Windows 7
└── Win7_sw.ps1          # Software info for Windows 7
```

If you need to customize the script paths, edit `deviceInfo.js`:

```javascript
const POWERSHELL_SCRIPTS_DIR = path.join(__dirname, "Powershell-scripts-main");
```

## Example Usage

### Node.js

```javascript
const {
  testWindowsCredentials,
  extractDeviceInfo,
  extractWindowsSoftware,
} = require("./deviceInfo");

async function scanDevice() {
  const ip = "192.168.1.100";
  const username = "Administrator";
  const password = "password";

  // 1. Test connection and detect OS
  const test = await testWindowsCredentials(ip, username, password);
  console.log("Detected OS:", test.os);

  // 2. Extract hardware info
  const hwInfo = await extractDeviceInfo({ ip, username, password });
  console.log("Hardware:", hwInfo.parsed);

  // 3. Extract software info
  const swInfo = await extractWindowsSoftware(ip, username, password, test.os);
  console.log("Software count:", swInfo.software_count);
}
```

### cURL

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

## Requirements

1. **PowerShell Scripts**: Ensure all 4 PowerShell scripts are in the `Powershell-scripts-main` directory
2. **WinRM Enabled**: Remote Windows hosts must have WinRM enabled
3. **Firewall**: Firewall must allow WinRM connections (port 5985/5986)
4. **Credentials**: Valid administrator credentials for remote hosts

## Troubleshooting

### Script Not Found Error

```json
{
  "status": "failed",
  "error": "Cannot find path 'C:\\Users\\...\\Win7_hard.ps1'"
}
```

**Solution**: Verify all PowerShell scripts are in the `Powershell-scripts-main` folder.

### Access Denied

```json
{
  "success": false,
  "error": "Access is denied"
}
```

**Solutions:**

- Verify credentials are correct
- Ensure the user has administrator privileges
- Check if WinRM is properly configured on the remote host

### Windows 7 Connection Issues

For Windows 7, you may need to enable WinRM:

```powershell
# On Windows 7 host
Enable-PSRemoting -Force
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
```

## Benefits

1. ✅ **Automatic OS Detection**: No manual configuration needed
2. ✅ **Compatible Scripts**: Uses appropriate WMI/CIM cmdlets for each OS
3. ✅ **Extensible**: Easy to add support for other OS-specific scripts
4. ✅ **Consistent API**: Same endpoints work for all Windows versions
5. ✅ **Detailed Logging**: Console logs show which script is being used

## Next Steps

- Add support for even older OS versions (Windows XP, Server 2003)
- Implement caching for OS detection to reduce redundant checks
- Add software filtering/search capabilities
- Create scheduled scanning jobs
