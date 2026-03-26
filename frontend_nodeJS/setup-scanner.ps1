# Enable Scanning for ALL IPs - Run Once as Administrator

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Network Scanner - One-Time Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "Setting TrustedHosts to allow ALL IPs..." -ForegroundColor Yellow
Write-Host "(This lets you scan any IP without adding each one individually)" -ForegroundColor Gray
Write-Host ""

try {
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
    Write-Host "✓ TrustedHosts configured successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current setting:" -ForegroundColor Cyan
    Get-Item WSMan:\localhost\Client\TrustedHosts | Select-Object Value
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now scan ANY IP from the web UI:" -ForegroundColor White
    Write-Host "  http://localhost:7000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "No need to add individual IPs anymore!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Failed to set TrustedHosts" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
}

pause
