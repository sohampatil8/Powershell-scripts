# Enable-WinRM.ps1 on windows 7 OS
# Run this script in PowerShell as Administrator

Write-Host "=== PowerShell Version ===" -ForegroundColor Green
$PSVersionTable.PSVersion

Write-Host "=== Configuring WinRM (non-interactive) ===" -ForegroundColor Green
# This enables the WinRM service and sets it to start automatically, without asking 'y/n'
winrm quickconfig -quiet

Write-Host "=== Making sure WinRM service is set to Automatic and Running ===" -ForegroundColor Green
Set-Service -Name WinRM -StartupType Automatic
Start-Service -Name WinRM

Write-Host "=== Adding firewall rule for WinRM HTTP (port 5985) ===" -ForegroundColor Green
netsh advfirewall firewall add rule name="WinRM HTTP" dir=in action=allow protocol=TCP localport=5985

Write-Host "=== Listing existing WinRM listeners (before create) ===" -ForegroundColor Green
winrm enumerate winrm/config/listener

Write-Host "=== Creating HTTP listener on all addresses ===" -ForegroundColor Green
winrm create winrm/config/Listener?Address=*+Transport=HTTP

Write-Host "=== Listing WinRM listeners (after create) ===" -ForegroundColor Green
winrm enumerate winrm/config/listener

Write-Host "=== WinRM service status ===" -ForegroundColor Green
Get-Service WinRM

Write-Host ""
Write-Host "Done. Press Enter to exit..." -ForegroundColor Cyan
[void][System.Console]::ReadLine()