# Add 192.168.1.234 to TrustedHosts
# Run this as Administrator

$current = (Get-Item WSMan:\localhost\Client\TrustedHosts).Value
Write-Host "Current TrustedHosts: $current" -ForegroundColor Cyan

if ($current -eq "*") {
    Write-Host "Already set to * (allows all hosts)" -ForegroundColor Green
} elseif ($current -like "*192.168.1.234*") {
    Write-Host "192.168.1.234 already in TrustedHosts" -ForegroundColor Green
} else {
    $new = if ($current) { "$current,192.168.1.234" } else { "192.168.1.234" }
    Write-Host "Adding 192.168.1.234 to TrustedHosts..." -ForegroundColor Yellow
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value $new -Force
    Write-Host "Done!" -ForegroundColor Green
}

Write-Host "`nNew TrustedHosts:" -ForegroundColor Cyan
Get-Item WSMan:\localhost\Client\TrustedHosts | Select-Object -ExpandProperty Value

Write-Host "`nNow testing connection to 192.168.1.234..." -ForegroundColor Yellow
$user = "IT-ITAM"
$pass = ConvertTo-SecureString "Itam@2989" -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($user, $pass)

try {
    $result = Invoke-Command -ComputerName 192.168.1.234 -Credential $cred -ScriptBlock {
        (Get-CimInstance Win32_OperatingSystem).Caption
    } -ErrorAction Stop
    Write-Host "✓ SUCCESS! Connected to 192.168.1.234" -ForegroundColor Green
    Write-Host "OS: $result" -ForegroundColor White
    Write-Host "`nYou can now scan this machine from http://localhost:7000" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Connection failed: $($_.Exception.Message)" -ForegroundColor Red
}
