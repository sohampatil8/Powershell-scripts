# 🚀 Quick Start Guide - OS-Based Device Scanning

## What's New?

Your Node.js application now **automatically detects the Windows OS version** and uses the appropriate PowerShell script, just like your Main3.ps1 does!

- **Windows 7**: Uses `Win7_hard.ps1` and `Win7_sw.ps1` (Get-WmiObject)
- **Modern Windows**: Uses `W32_Remote_hw.ps1` and `W32_Remote_sw.ps1` (Get-CimInstance)

## 🎯 Quick Test (3 Easy Ways)

### Option 1: Web Interface (Easiest!)

1. **Start the server:**

   ```powershell
   npm start
   ```

2. **Open in browser:**

   ```
   http://localhost:1000/test-os-ui.html
   ```

3. **Enter credentials and click buttons!**

---

### Option 2: Command Line Test

```powershell
# Start server in background
Start-Process powershell -ArgumentList "npm start"

# Wait a moment for server to start
Start-Sleep -Seconds 3

# Run test (replace with your values)
node test-os-detection.js 192.168.1.100 Administrator YourPassword
```

---

### Option 3: API Testing with cURL

```powershell
# Test connection and detect OS
curl -X POST http://localhost:1000/api/test-connection `
  -H "Content-Type: application/json" `
  -d '{\"ip\":\"192.168.1.100\",\"username\":\"Administrator\",\"password\":\"pass123\"}'

# Get hardware info
curl -X POST http://localhost:1000/api/device-info/single `
  -H "Content-Type: application/json" `
  -d '{\"ip\":\"192.168.1.100\",\"username\":\"Administrator\",\"password\":\"pass123\"}'

# Get software info
curl -X POST http://localhost:1000/api/software-info `
  -H "Content-Type: application/json" `
  -d '{\"ip\":\"192.168.1.100\",\"username\":\"Administrator\",\"password\":\"pass123\"}'
```

## 📊 What You'll See

### Console Output Example:

```
[192.168.1.100] Attempting Windows connection...
[192.168.1.100] Windows connection successful, OS: Microsoft Windows 10 Pro
[192.168.1.100] Using Modern Windows hardware script
[192.168.1.100] Extracting info using OS-specific scripts...
```

### API Response Example:

```json
{
  "status": "success",
  "os_detected": "Microsoft Windows 10 Pro",
  "parsed": {
    "hostname": "PC-001",
    "os_detection": "Modern Windows",
    "script_used": "W32_Remote_hw.ps1",
    "manufacturer": "Dell Inc.",
    "cpu": "Intel Core i7",
    "memory": { "total": "16 GB" }
  }
}
```

## ✅ Pre-flight Checklist

Before testing, ensure:

- [ ] Server dependencies installed: `npm install`
- [ ] PowerShell scripts are in `Powershell-scripts-main/` folder:
  - `W32_Remote_hw.ps1`
  - `W32_Remote_sw.ps1`
  - `Win7_hard.ps1`
  - `Win7_sw.ps1`
- [ ] Target machine has WinRM enabled
- [ ] You have valid admin credentials

## 🔧 Quick WinRM Setup (If Needed)

On the **target Windows machine**, run PowerShell as Administrator:

```powershell
# Enable WinRM
Enable-PSRemoting -Force

# Allow all hosts (or specify your scanner IP)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force

# Restart WinRM service
Restart-Service WinRM

# Test it works
Test-WSMan localhost
```

## 📚 Files Created

✅ **IMPLEMENTATION-SUMMARY.md** - Complete technical summary
✅ **OS-DETECTION-README.md** - Detailed documentation
✅ **test-os-detection.js** - Command-line test script
✅ **test-os-ui.html** - Web test interface
✅ **QUICK-START.md** - This file!

## 🎉 You're Ready!

Your application now has intelligent OS detection and automatic script selection. Just start the server and try it out!

```powershell
npm start
```

Then open: **http://localhost:1000/test-os-ui.html**

## 💡 Usage in Your Code

```javascript
const { extractDeviceInfo, extractWindowsSoftware } = require("./deviceInfo");

// Extract hardware (auto-detects OS)
const hwInfo = await extractDeviceInfo({
  ip: "192.168.1.100",
  username: "Administrator",
  password: "pass123",
});

console.log("OS Detection:", hwInfo.parsed.os_detection);
console.log("Script Used:", hwInfo.parsed.script_used);
```

## ❓ Need Help?

- **Detailed docs**: See `OS-DETECTION-README.md`
- **Technical details**: See `IMPLEMENTATION-SUMMARY.md`
- **Test not working**: Check the "Troubleshooting" section in OS-DETECTION-README.md

Happy scanning! 🎊
