# Quick Setup Guide - Fix "Cannot Connect" Error

## Problem

You're getting:

```
The WinRM client cannot process the request...
the destination machine must be added to the TrustedHosts configuration setting
```

## Solution (2 Simple Steps)

### Step 1: Add IP to TrustedHosts (Run as Administrator)

1. **Right-click PowerShell** → **"Run as Administrator"**
2. Run this command:

```powershell
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "192.168.56.1,192.168.1.234" -Force
```

Or run the script:

```powershell
powershell -ExecutionPolicy Bypass -File .\add-trusted-host.ps1
```

### Step 2: Use the Web UI

1. Open: **http://localhost:7000**
2. Go to **02 DEVICE INFO** tab
3. Enter:
   - IP: `192.168.1.234`
   - Username: `IT-ITAM`
   - Password: `Itam@2989`
4. Click **TEST** button
5. Click **EXTRACT INFO**

## Why This Happens

WinRM requires remote machines to be "trusted" before connecting. Adding them to TrustedHosts tells your computer it's safe to connect.

## Alternative: Trust All IPs (Less Secure)

If you're scanning many different IPs, you can trust all:

```powershell
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
```

⚠️ Only do this on secure networks!

## Verify Configuration

Check current TrustedHosts:

```powershell
Get-Item WSMan:\localhost\Client\TrustedHosts
```

## Still Not Working?

Make sure WinRM is enabled on the **target machine** (192.168.1.234):

1. On 192.168.1.234, open PowerShell as Administrator
2. Run:

```powershell
Enable-PSRemoting -Force
winrm quickconfig -force
```

## Need Help?

Run diagnostics:

```powershell
Test-WSMan -ComputerName 192.168.1.234
```

If this works, your credentials should work in the UI!
