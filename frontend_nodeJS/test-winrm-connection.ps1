# Test WinRM Connection to Remote Machine
# Run this FROM YOUR SCANNING COMPUTER to test if target is accessible

param(
    [Parameter(Mandatory=$true)]
    [string]$ComputerName,
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "Administrator",
    
    [Parameter(Mandatory=$false)]
    [string]$Password
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  WinRM Connection Tester" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test basic connectivity
Write-Host "[1/4] Testing network connectivity..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $ComputerName -Count 1 -Quiet
if ($pingResult) {
    Write-Host "  ✓ $ComputerName is reachable via ping" -ForegroundColor Green
} else {
    Write-Host "  ✗ $ComputerName is NOT reachable via ping" -ForegroundColor Red
    Write-Host "  Check if the IP address is correct and the machine is powered on." -ForegroundColor Yellow
    exit
}

# Test WinRM port
Write-Host "[2/4] Testing WinRM port (5985)..." -ForegroundColor Yellow
$portTest = Test-NetConnection -ComputerName $ComputerName -Port 5985 -WarningAction SilentlyContinue
if ($portTest.TcpTestSucceeded) {
    Write-Host "  ✓ Port 5985 is open (WinRM is listening)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Port 5985 is closed or blocked" -ForegroundColor Red
    Write-Host "  WinRM is not enabled on the target machine." -ForegroundColor Yellow
    Write-Host "  Run 'enable-winrm-remote.ps1' ON THE TARGET MACHINE." -ForegroundColor Yellow
    exit
}

# Test WS-Man
Write-Host "[3/4] Testing WS-Management..." -ForegroundColor Yellow
try {
    $wsmanTest = Test-WSMan -ComputerName $ComputerName -ErrorAction Stop
    Write-Host "  ✓ WS-Management is responding" -ForegroundColor Green
    Write-Host "    Product: $($wsmanTest.ProductVendor) v$($wsmanTest.ProductVersion)" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ WS-Management test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test with credentials
Write-Host "[4/4] Testing authenticated connection..." -ForegroundColor Yellow

if (-not $Password) {
    $Credential = Get-Credential -UserName $Username -Message "Enter password for $Username@$ComputerName"
} else {
    $SecurePassword = ConvertTo-SecureString $Password -AsPlainText -Force
    $Credential = New-Object System.Management.Automation.PSCredential($Username, $SecurePassword)
}

try {
    $result = Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
        @{
            Hostname = $env:COMPUTERNAME
            OS = (Get-CimInstance Win32_OperatingSystem).Caption
            User = $env:USERNAME
        }
    } -ErrorAction Stop
    
    Write-Host "  ✓ Successfully authenticated and connected!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Remote Machine Info:" -ForegroundColor Cyan
    Write-Host "  Hostname: $($result.Hostname)" -ForegroundColor White
    Write-Host "  OS: $($result.OS)" -ForegroundColor White
    Write-Host "  Connected as: $($result.User)" -ForegroundColor White
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "SUCCESS! You can now scan this machine from the web UI." -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    
} catch {
    Write-Host "  ✗ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  1. Wrong username or password" -ForegroundColor Yellow
    Write-Host "  2. User doesn't have admin rights on target machine" -ForegroundColor Yellow
    Write-Host "  3. TrustedHosts not configured (run: Set-Item WSMan:\localhost\Client\TrustedHosts -Value '*' -Force)" -ForegroundColor Yellow
}

Write-Host ""
