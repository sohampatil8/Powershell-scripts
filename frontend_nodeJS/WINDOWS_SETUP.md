# Windows Remote Management Setup Guide

## Prerequisites for Scanning Windows Machines

To scan Windows machines, **WinRM (Windows Remote Management)** must be enabled on the target computers.

### On Target Machines (Computers to be Scanned):

#### Enable WinRM

Run this in PowerShell **as Administrator** on each target machine:

```powershell
# Enable WinRM
Enable-PSRemoting -Force

# Allow remote access
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force

# Configure firewall
Enable-NetFirewallRule -Name "WINRM-HTTP-In-TCP"

# Start WinRM service
Start-Service WinRM
Set-Service WinRM -StartupType Automatic

# Verify
Test-WSMan
```

#### For Non-Domain Computers:

If scanning across networks (not in same domain):

```powershell
# On Scanner Machine (this computer)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force

# Or specify IPs
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "192.168.56.1,192.168.1.10" -Force
```

### Quick Test from This Machine:

Test if you can connect to a remote machine:

```powershell
# Test connection
Test-WSMan -ComputerName 192.168.56.1

# Test with credentials
$cred = Get-Credential
Invoke-Command -ComputerName 192.168.56.1 -Credential $cred -ScriptBlock { hostname }
```

## Running the Scanner

### 1. Start the Server

```bash
npm start
```

Server runs at: **http://localhost:6000**

### 2. Open Web UI

Navigate to: **http://localhost:6000**

### 3. Scan IPs

**Step 1 - PING SCAN:**

- Enter IP: `192.168.56.1`
- Click **START SCAN**
- See which IPs are alive

**Step 2 - DEVICE INFO:**

- Click **"ADD ALL →"** to import alive IPs
- Enter credentials:
  - Username: `Administrator` or domain user
  - Password: _(your password)_
- Click **TEST** button to verify credentials
- Click **EXTRACT INFO** to scan

## Credentials Format

### For Local Administrator:

```
Username: Administrator
Password: Pass@123
```

### For Domain Users:

```
Username: DOMAIN\username
Password: yourpassword
```

Or:

```
Username: username@domain.com
Password: yourpassword
```

## Common Issues

### Issue: "Access Denied"

**Solution:** Make sure:

1. User has administrator privileges on target machine
2. WinRM is enabled (see above)
3. Credentials are correct (test with TEST button)

### Issue: "Connection timeout"

**Solution:**

1. Check if target is pingable
2. Verify firewall allows WinRM (port 5985)
3. Check TrustedHosts setting

### Issue: "Cannot connect to remote server"

**Solution:**

```powershell
# On both machines
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
Restart-Service WinRM
```

## What Gets Extracted

The scanner collects:

- ✅ Hostname, Domain, Model, Manufacturer
- ✅ Operating System, Architecture, Build
- ✅ CPU (Name, Speed, Cores, Sockets)
- ✅ Memory (Total RAM)
- ✅ Disks & Drives
- ✅ Network Adapters, IP Addresses, MAC Addresses
- ✅ Graphics Card
- ✅ Serial Number
- ✅ Install Date, Last Boot Time
- ✅ And more...

## Security Notes

- Credentials are **not stored** - only used for connection
- Traffic uses WinRM (port 5985 HTTP or 5986 HTTPS)
- For production, configure HTTPS endpoint
- Use dedicated service account with limited privileges
- Consider Group Policy for WinRM deployment

## Advanced Configuration

### Use HTTPS (Recommended for Production):

```powershell
# Create self-signed certificate
New-SelfSignedCertificate -DnsName $(hostname) -CertStoreLocation Cert:\LocalMachine\My

# Configure HTTPS listener
winrm create winrm/config/Listener?Address=*+Transport=HTTPS @{Hostname="$(hostname)";CertificateThumbprint="<thumbprint>"}

# Then update code to use port 5986
```

### Bulk Enable WinRM with Group Policy:

1. Open Group Policy Management
2. Create/Edit GPO
3. Navigate to: Computer Configuration > Policies > Administrative Templates > Windows Components > Windows Remote Management (WinRM) > WinRM Service
4. Enable "Allow remote server management through WinRM"
5. Set IPv4/IPv6 filters: `*`

## Testing the Setup

Test with the built-in web UI or PowerShell:

```powershell
# Direct test
cd c:\Users\Gaurav\Downloads\files
node -e "const {testWindowsCredentials} = require('./deviceInfo'); testWindowsCredentials('192.168.56.1', 'Administrator', 'Pass@123').then(console.log)"
```

## Support

If issues persist, check:

1. Windows Event Viewer > Applications and Services Logs > Microsoft > Windows > WinRM
2. Firewall logs
3. Network connectivity (ping, tracert)
