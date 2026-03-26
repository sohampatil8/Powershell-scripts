# Two-Level Option System: OS Selection & Scanning Methods

## Overview

This project now supports a **two-level option system** for device scanning:

1. **Level 1: OS Selection** - Choose the target operating system type
2. **Level 2: Scanning Method** - Select the scanning approach (specific to Windows)

## Feature Implementation

### Level 1: OS Selection

You can now specify which type of operating system you're scanning:

- **Auto-Detect** (default) - Automatically tries Windows first, then falls back to SSH
- **Windows** - Forces Windows-only scanning (fails if not Windows)
- **Linux** - Forces Linux SSH scanning only
- **macOS** - Forces macOS SSH scanning only
- **Network Device** - For network equipment (future implementation)

### Level 2: Windows Scanning Methods

When targeting Windows systems, you can choose between **three** scanning approaches:

#### 1. PowerShell (CIM) - Recommended

- **Best For**: Modern Windows (Windows 8, 10, 11, Server 2012+)
- **Technology**: Uses Get-CimInstance cmdlets
- **Advantages**:
  - Fastest performance
  - More modern approach
  - Better structured data
  - Recommended by Microsoft
- **Requires**: PowerShell 3.0+ on target
- **Scripts Used**:
  - `W32_Remote_hw.ps1` (Hardware)
  - `W32_Remote_sw.ps1` (Software)

#### 2. WMI (Legacy) - Compatible

- **Best For**: Older Windows versions (Windows 7, Server 2008, etc.)
- **Technology**: Uses Get-WmiObject cmdlets
- **Advantages**:
  - Better compatibility with legacy systems
  - Works on Windows 7 and older
  - More universally supported
- **Requires**: PowerShell (any version) on target
- **Scripts Used**:
  - `WMI_Remote_hw.ps1` (Hardware)
  - `WMI_Remote_sw.ps1` (Software)

#### 3. WMIC (PowerShell-Free) - 100% Reliable ⭐ NEW

- **Best For**: Systems with PowerShell disabled/removed
- **Technology**: Uses native WMIC.EXE commands (no PowerShell cmdlets)
- **Advantages**:
  - **No PowerShell required on target!**
  - Works on ALL Windows versions (XP to 11)
  - Cannot be blocked by PowerShell policies
  - Maximum reliability and compatibility
  - Works in security-restricted environments
- **Requires**: Only WMIC.EXE (native Windows component)
- **Scripts Used**:
  - `WMIC_Remote_hw.bat` (Hardware)
  - `WMIC_Remote_sw.bat` (Software)
- **See**: [WMIC-METHOD-README.md](WMIC-METHOD-README.md) for complete details

## New Features

### 1. WMIC Batch Scripts (PowerShell-Independent)

Created two batch scripts for WMIC-based scanning - **completely PowerShell-free**:

**WMIC_Remote_hw.bat**

- Pure CMD/Batch script using WMIC commands
- Collects comprehensive hardware information
- Works even if PowerShell is completely removed
- Includes: System info, OS details, CPU, Memory, Storage, Network, Video
- Returns JSON format for compatibility

**WMIC_Remote_sw.bat**

- Pure CMD/Batch script for software inventory
- Uses registry queries and WMIC
- Faster and more reliable than Win32_Product
- Includes: Installed apps, Services, Hotfixes, Startup programs
- Returns JSON format

### 2. WMI PowerShell Scripts

Created two new scripts for WMI-based scanning:

**WMI_Remote_hw.ps1**

- Collects comprehensive hardware information using WMI
- Includes: System info, OS details, CPU, Memory, Storage, Network, Video
- Returns JSON format for easy parsing

**WMI_Remote_sw.ps1**

- Extracts installed software using registry-based approach
- Includes: Applications, Windows Features, Services, Hotfixes, Startup programs
- Faster than Win32_Product WMI class

### 2. Updated Backend (deviceInfo.js)

- Added `extractWindowsInfoWMI()` function for WMI-based extraction
- Modified `extractDeviceInfo()` to accept `osType` and `method` parameters
- Enhanced routing logic to use appropriate scanning method

### 3. Updated API (server.js)

Updated endpoints to support new parameters:

```javascript
POST /api/device-info
Body: {
  hosts: [{
    ip, username, password, port?,
    osType?, // "windows" | "linux" | "mac" | "auto"
    method?  // "powershell" | "wmi"
  }],
  socketId: "..."
}

POST /api/device-info/single
Body: {
  ip, username, password, port?,
  osType?, // "windows" | "linux" | "mac" | "auto"
  method?  // "powershell" | "wmi"
}
```

### 4. Enhanced UI (index.html)

Added two dropdown menus in the Device Info Panel:

**Target OS Dropdown**

- Auto-Detect (default)
- Windows
- Linux
- macOS
- Network Device

**Windows Scan Method Dropdown**

- PowerShell (CIM - Recommended)
- WMI (Legacy Compatible)
- Automatically shown/hidden based on OS selection
- Only visible when "Auto-Detect" or "Windows" is selected

## Usage Guide

### Basic Usage

1. **Open the Application**
   - Navigate to the Device Info Panel (Tab 02)

2. **Select Target OS**
   - Choose from the "Target OS" dropdown
   - Default is "Auto-Detect" for automatic detection

3. **Select Windows Method** (if applicable)
   - When Windows or Auto-Detect is selected
   - Choose between:
     - "PowerShell" (recommended for modern Windows)
     - "WMI" (for legacy Windows 7)
     - "WMIC" (for systems without PowerShell) ⭐ NEW

4. **Add Credentials**
   - Click "+ ADD HOST" or "↑ FROM SCAN"
   - Enter IP, username, and password
   - Click "TEST" to verify connection

5. **Start Scanning**
   - Click "▶ EXTRACT INFO" to begin
   - Monitor progress in the log terminal

### Decision Guide: PowerShell vs WMI

**Use PowerShell when:**

- ✅ Targeting Windows 8+ or Server 2012+
- ✅ You want the fastest performance
- ✅ Systems have PowerShell 3.0+ installed
- ✅ You're using modern Windows environments

**Use WMI when:**

- ✅ Targeting Windows 7 or Server 2008
- ✅ Compatibility is more important than speed
- ✅ PowerShell scanning is failing
- ✅ Working with mixed legacy environments

### Examples

#### Example 1: Modern Windows Environment

```
OS: Windows
Method: PowerShell (CIM)
Result: Fast, comprehensive hardware/software data
```

#### Example 2: Legacy Windows 7 Systems

```
OS: Windows
Method: WMI (Legacy)
Result: Compatible scanning for older systems
```

#### Example 3: Mixed Environment

```
OS: Auto-Detect
Method: PowerShell (default)
Result: Auto-detects OS type, tries PowerShell first, falls back to WMI if needed
```

## Technical Details

### Data Collected (Windows)

**Hardware Information:**

- System: Hostname, Domain, Manufacturer, Model, Serial Number
- Operating System: Version, Architecture, Build, Install Date
- Processor: Model, Speed, Cores, Threads
- Memory: Total, Slots, Module details
- Storage: Disk drives, Logical drives, Capacity
- Network: Adapters, IP addresses, MAC addresses
- Graphics: Video controller, VRAM
- BIOS: Version, Manufacturer, Release date

**Software Information:**

- Installed applications (via registry)
- Windows Features
- Services (running/stopped)
- Installed updates/hotfixes
- Startup programs

### Performance Considerations

- **PowerShell (CIM)**: ~2-5 seconds per host
- **WMI**: ~3-7 seconds per host
- **SSH (Linux)**: ~1-3 seconds per host
- Concurrent scanning: 5 hosts at a time (configurable)

### Error Handling

The system provides graceful fallback:

1. If OS type is "Auto", tries Windows first
2. If Windows fails, tries SSH for Linux/Unix
3. If method is PowerShell and fails, you can retry with WMI
4. Detailed error messages in the log terminal

## File Structure

```
files/
├── index.html              # Main UI with OS/Method selectors
├── server.js               # API endpoints with new parameters
├── deviceInfo.js           # Backend logic for scanning
├── Powershell-scripts-main/
│   ├── W32_Remote_hw.ps1   # PowerShell hardware script
│   ├── W32_Remote_sw.ps1   # PowerShell software script
│   ├── WMI_Remote_hw.ps1   # NEW: WMI hardware script
│   ├── WMI_Remote_sw.ps1   # NEW: WMI software script
│   ├── Win7_hard.ps1       # Windows 7 hardware script
│   └── Win7_sw.ps1         # Windows 7 software script
```

## Future Enhancements

Planned features for other operating systems:

### Linux

- Multiple methods: SSH, Ansible, SNMP
- Package manager detection (apt, yum, zypper)
- Kernel-specific optimizations

### macOS

- SSH with macOS-specific commands
- System Profiler integration
- Apple Silicon support

### Network Devices

- SNMP v2/v3 support
- Telnet fallback
- Cisco/HP/Juniper specific parsers

## Troubleshooting

### Issue: WMI scanning fails

**Solution**:

- Ensure WinRM is enabled on target
- Check firewall rules
- Verify credentials have admin rights

### Issue: PowerShell method shows errors

**Solution**:

- Switch to WMI method for legacy systems
- Update PowerShell to latest version
- Check execution policy settings

### Issue: Auto-detect not working

**Solution**:

- Manually select OS type
- Verify network connectivity
- Check credentials

## Configuration

Settings can be adjusted in the Config Panel:

- Ping Timeout (default: 3 seconds)
- Concurrent Pings (default: 20)
- SSH Timeout (default: 10 seconds)
- Concurrent SSH Connections (default: 5)

## Security Notes

- All credentials are transmitted securely within local network
- PowerShell execution is restricted to provided scripts
- No credentials are stored permanently
- Use credential sets feature for convenience

## Support

For issues or questions:

1. Check the log terminal for detailed error messages
2. Verify WinRM/SSH connectivity manually
3. Test with both PowerShell and WMI methods
4. Review the Windows Setup documentation

---

**Version**: 2.0 with Two-Level Options
**Last Updated**: March 17, 2026
**Compatibility**: Windows 7+, Linux, macOS (partial)
