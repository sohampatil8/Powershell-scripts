# Enable WinRM on Remote Machine
# Run this script ON THE TARGET MACHINE (192.168.56.1) as Administrator

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  WinRM Quick Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "[1/7] Enabling PowerShell Remoting..." -ForegroundColor Green
try {
    Enable-PSRemoting -Force -SkipNetworkProfileCheck | Out-Null
    Write-Host "  ✓ PowerShell Remoting enabled" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "[2/7] Starting WinRM service..." -ForegroundColor Green
try {
    Start-Service WinRM -ErrorAction Stop
    Set-Service WinRM -StartupType Automatic
    Write-Host "  ✓ WinRM service started and set to automatic" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "[3/7] Configuring WinRM..." -ForegroundColor Green
try {
    winrm quickconfig -q -force
    Write-Host "  ✓ WinRM quick config completed" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "[4/7] Configuring firewall..." -ForegroundColor Green
try {
    Enable-NetFirewallRule -Name "WINRM-HTTP-In-TCP-Public" -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -Name "WINRM-HTTP-In-TCP" -ErrorAction Stop
    Write-Host "  ✓ Firewall rules enabled" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "[5/7] Configuring authentication..." -ForegroundColor Green
try {
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
    Write-Host "  ✓ TrustedHosts configured (allows any client)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "[6/7] Setting network profile..." -ForegroundColor Green
try {
    Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue
    Write-Host "  ✓ Network profile set to Private" -ForegroundColor Green
} catch {
    Write-Host "  ! Warning: Could not set network profile" -ForegroundColor Yellow
}

Write-Host "[7/7] Testing WinRM..." -ForegroundColor Green
try {
    $testResult = Test-WSMan -ErrorAction Stop
    Write-Host "  ✓ WinRM is working!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Machine Info:" -ForegroundColor Cyan
    Write-Host "  ProductVendor: $($testResult.ProductVendor)" -ForegroundColor White
    Write-Host "  ProductVersion: $($testResult.ProductVersion)" -ForegroundColor White
} catch {
    Write-Host "  ✗ WinRM test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your computer is now ready to be scanned." -ForegroundColor Green
Write-Host "You can scan this machine from the web UI at http://localhost:6000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Computer Name: $env:COMPUTERNAME" -ForegroundColor Cyan
Write-Host "IP Addresses:" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' 
} | ForEach-Object { Write-Host "  - $($_.IPAddress)" -ForegroundColor White }
Write-Host ""

pause
