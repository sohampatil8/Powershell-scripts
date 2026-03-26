# Quick Credential Test - Run this before using the Web UI
# This will tell you exactly what's wrong if credentials don't work

param(
    [string]$ComputerName = "192.168.56.1",
    [string]$Username = "Administrator",
    [string]$Password = ""
)

if (-not $Password) {
    $Password = Read-Host -Prompt "Enter password for $Username@$ComputerName"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Testing: $ComputerName" -ForegroundColor Cyan
Write-Host "  User: $Username" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Ping
Write-Host "[1/3] Testing ping..." -ForegroundColor Yellow
if (Test-Connection -ComputerName $ComputerName -Count 1 -Quiet) {
    Write-Host "  ✓ Ping successful" -ForegroundColor Green
} else {
    Write-Host "  ✗ Ping failed - machine may be offline" -ForegroundColor Red
    exit
}

# Test 2: WinRM
Write-Host "[2/3] Testing WinRM..." -ForegroundColor Yellow
try {
    $wsmanResult = Test-WSMan -ComputerName $ComputerName -ErrorAction Stop
    Write-Host "  ✓ WinRM is enabled and responding" -ForegroundColor Green
} catch {
    Write-Host "  ✗ WinRM is not enabled or not accessible" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "  Run 'enable-winrm-remote.ps1' ON THE TARGET MACHINE" -ForegroundColor Yellow
    exit
}

# Test 3: Credentials
Write-Host "[3/3] Testing credentials..." -ForegroundColor Yellow
try {
    $SecurePassword = ConvertTo-SecureString $Password -AsPlainText -Force
    $Credential = New-Object System.Management.Automation.PSCredential($Username, $SecurePassword)
    
    $result = Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
        @{
            Hostname = $env:COMPUTERNAME
            OS = (Get-CimInstance Win32_OperatingSystem).Caption
            User = $env:USERNAME
            Domain = $env:USERDOMAIN
        }
    } -ErrorAction Stop
    
    Write-Host "  ✓ Credentials are VALID!" -ForegroundColor Green
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Connection working!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`nTarget Machine Info:" -ForegroundColor Cyan
    Write-Host "  Hostname: $($result.Hostname)" -ForegroundColor White
    Write-Host "  OS: $($result.OS)" -ForegroundColor White
    Write-Host "  Domain: $($result.Domain)" -ForegroundColor White
    Write-Host "  Connected as: $($result.User)" -ForegroundColor White
    Write-Host "`nYou can now use these credentials in the Web UI at:" -ForegroundColor Yellow
    Write-Host "  http://localhost:7000" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "  ✗ Credentials FAILED" -ForegroundColor Red
    Write-Host "`nError Details:" -ForegroundColor Yellow
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "`nCommon Issues:" -ForegroundColor Yellow
    Write-Host "  1. Wrong username or password" -ForegroundColor White
    Write-Host "  2. User '$Username' doesn't exist on $ComputerName" -ForegroundColor White
    Write-Host "  3. User doesn't have administrator rights" -ForegroundColor White
    Write-Host "  4. For domain users, use format: DOMAIN\username" -ForegroundColor White
    Write-Host ""
}
