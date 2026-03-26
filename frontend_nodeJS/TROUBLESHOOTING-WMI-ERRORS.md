# Troubleshooting "No Instance(s) Available" Error

## Error Description

When you see: **"Windows extraction failed: No Instance(s) Available"**

This WMI error means the remote Windows system cannot return WMI data. This is usually **not** a network issue, but a WMI service issue on the target machine.

## Quick Diagnosis

### Run Diagnostic on Target Machine

1. **Open PowerShell as Administrator** on the target machine
2. Run the diagnostic script:
   ```powershell
   .\Test-WMI-Connection.ps1 -Detailed
   ```
3. Check which tests fail

### Common Causes

| Cause                        | Symptoms                     | Solution                  |
| ---------------------------- | ---------------------------- | ------------------------- |
| **WMI Service Stopped**      | All queries fail             | Restart WMI service       |
| **Corrupted WMI Repository** | Random/intermittent failures | Rebuild WMI repository    |
| **Insufficient Permissions** | Access denied errors         | Use admin credentials     |
| **Firewall Blocking**        | Connection timeout           | Enable WMI firewall rules |
| **WinRM Not Configured**     | Cannot connect               | Enable-PSRemoting         |

## Quick Fixes

### Fix 1: Restart WMI Service (Fastest)

On the **target machine**, run as Administrator:

```powershell
# Stop WMI
net stop winmgmt

# Wait 5 seconds
Start-Sleep -Seconds 5

# Start WMI
net start winmgmt
```

Or use PowerShell:

```powershell
Restart-Service -Name "Winmgmt" -Force
```

### Fix 2: Rebuild WMI Repository (If corrupted)

On the **target machine**, run as Administrator:

```powershell
# 1. Verify repository status
winmgmt /verifyrepository

# 2. If inconsistent, salvage it
winmgmt /salvagerepository

# 3. If salvage fails, reset (WARNING: removes all WMI data)
# Backup first, then:
# winmgmt /resetrepository
```

### Fix 3: Use Automated Repair Script

On the **target machine**, run as Administrator:

```powershell
.\Fix-WMI-Service.ps1
```

This script automatically:

- Stops WMI service
- Verifies/repairs repository
- Re-registers WMI components
- Configures firewall
- Restarts service

### Fix 4: Enable WinRM (Required for Remote Access)

On the **target machine**, run as Administrator:

```powershell
# Enable PowerShell Remoting
Enable-PSRemoting -Force

# Configure TrustedHosts (if not in domain)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force

# Restart WinRM service
Restart-Service WinRM
```

### Fix 5: Configure Firewall

On the **target machine**, run as Administrator:

```powershell
# Enable WMI through firewall
netsh advfirewall firewall set rule group="Windows Management Instrumentation (WMI)" new enable=yes

# Enable WinRM through firewall
netsh advfirewall firewall set rule group="Windows Remote Management" new enable=yes
```

## Testing After Fixes

### Test 1: Local WMI Test

On the **target machine**:

```powershell
Get-WmiObject -Class Win32_ComputerSystem
```

Should return computer information.

### Test 2: Remote WMI Test

From your **scanning server**:

```powershell
$cred = Get-Credential
Invoke-Command -ComputerName TARGET_IP -Credential $cred -ScriptBlock {
    Get-WmiObject -Class Win32_ComputerSystem
}
```

### Test 3: Use Scanner's Test Button

In the web interface:

1. Add the target IP with credentials
2. Click **TEST** button
3. Check the log for connection status

## Alternative Methods

If WMI continues to fail, try different scanning methods:

### Method 1: Use WMIC (PowerShell-Free)

1. In web interface, select **Windows Scan Method: WMIC**
2. WMIC uses different code path and may work when WMI fails
3. Click **▶ EXTRACT INFO**

### Method 2: Try PowerShell CIM (Modern)

1. Select **Windows Scan Method: PowerShell (CIM)**
2. Uses Get-CimInstance instead of Get-WmiObject
3. May work better on Windows 8+

## Advanced Troubleshooting

### Check Event Viewer

On **target machine**:

1. Open Event Viewer
2. Navigate to: **Applications and Services Logs → Microsoft → Windows → WMI-Activity**
3. Look for errors around the time of failed scan

### Check WMI Permission

On **target machine**:

1. Run `wmimgmt.msc`
2. Right-click **WMI Control** → **Properties**
3. Go to **Security** tab
4. Ensure your user has proper permissions on ROOT namespace

### Test Specific WMI Classes

On **target machine**:

```powershell
# Test each class individually
Get-WmiObject -Class Win32_ComputerSystem
Get-WmiObject -Class Win32_OperatingSystem
Get-WmiObject -Class Win32_Processor
Get-WmiObject -Class Win32_BIOS
Get-WmiObject -Class Win32_PhysicalMemory
Get-WmiObject -Class Win32_DiskDrive
Get-WmiObject -Class Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True"
```

### Review WMI Repository Health

On **target machine**:

```powershell
# Check consistency
winmgmt /verifyrepository

# Expected output if healthy:
# "WMI repository is consistent"

# If inconsistent:
# "WMI repository is inconsistent"
# Then run: winmgmt /salvagerepository
```

## Specific Error Messages

### "Access is denied"

**Cause**: Insufficient permissions  
**Solution**:

- Use Administrator account
- Add user to "Distributed COM Users" group
- Configure WMI namespace security

### "The RPC server is unavailable"

**Cause**: WinRM/RPC not configured or firewall blocking  
**Solution**:

- Enable-PSRemoting
- Configure firewall rules
- Start RPC service

### "Network path not found"

**Cause**: Cannot reach remote computer  
**Solution**:

- Verify IP address
- Check network connectivity (ping test)
- Verify computer name resolution

### "Invalid class"

**Cause**: WMI repository corruption  
**Solution**:

- Rebuild WMI repository
- Re-register MOF files

## Prevention

### Regular Maintenance

On target machines:

1. Keep Windows updated
2. Regularly verify WMI: `winmgmt /verifyrepository`
3. Monitor WMI-Activity event logs
4. Backup WMI repository before major changes

### Best Practices

- Use domain admin accounts when available
- Configure WinRM at deployment
- Test WMI health in scheduled tasks
- Document known working configurations

## Still Not Working?

If all else fails:

### Option 1: Use WMIC Method

The WMIC method doesn't use WMI PowerShell cmdlets and may work:

```
Select: Windows Scan Method → WMIC (100% PowerShell-Free)
```

### Option 2: Manual WMI Rebuild

Complete WMI reinstallation (Windows will rebuild):

```powershell
# Stop service
net stop winmgmt /y

# Rename repository folder (backup)
Rename-Item C:\Windows\System32\wbem\Repository Repository.old

# Restart service (will rebuild)
net start winmgmt
```

### Option 3: Contact System Administrator

- WMI may be intentionally disabled
- Group Policy may be blocking access
- System may need professional repair

## Quick Reference Commands

```powershell
# Diagnosis
.\Test-WMI-Connection.ps1 -Detailed

# Quick Fix
.\Fix-WMI-Service.ps1

# Manual Service Restart
Restart-Service Winmgmt -Force

# Verify Repository
winmgmt /verifyrepository

# Salvage Repository
winmgmt /salvagerepository

# Enable Remote Access
Enable-PSRemoting -Force

# Configure Firewall
netsh advfirewall firewall set rule group="Windows Management Instrumentation (WMI)" new enable=yes
```

---

**Most Common Solution**: 90% of "No Instance(s) Available" errors are fixed by restarting the WMI service on the target machine.

**Quick Command**:

```powershell
Restart-Service Winmgmt -Force
```

Run this on the target machine as Administrator!
