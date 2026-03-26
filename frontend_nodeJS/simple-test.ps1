# Simple Credential Test
$ip = "192.168.56.1"
$user = "Administrator"

Write-Host "`nTesting connection to $ip..." -ForegroundColor Cyan
Write-Host "Enter password for $user when prompted`n" -ForegroundColor Yellow

$pass = Read-Host -AsSecureString -Prompt "Password"
$cred = New-Object System.Management.Automation.PSCredential($user, $pass)

try {
    Write-Host "`nAttempting connection..." -ForegroundColor Yellow
    $result = Invoke-Command -ComputerName $ip -Credential $cred -ScriptBlock {
        (Get-CimInstance Win32_OperatingSystem).Caption
    } -ErrorAction Stop
    
    Write-Host "`n✓ SUCCESS! Connected to $ip" -ForegroundColor Green
    Write-Host "OS: $result" -ForegroundColor White
    Write-Host "`nYou can now use these credentials in the Web UI" -ForegroundColor Cyan
    Write-Host "http://localhost:7000" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n✗ FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "`nPossible issues:" -ForegroundColor Yellow
    Write-Host "- Wrong password" -ForegroundColor White
    Write-Host "- User doesn't have admin rights" -ForegroundColor White
    Write-Host "- WinRM not enabled on target" -ForegroundColor White
}

Write-Host ""
