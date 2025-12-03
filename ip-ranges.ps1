$InputFile = "C:\Users\Soham Patil\OneDrive - TECHVITS SOLUTIONS PRIVATE LIMITED\powershell_script\ip-range.txt"
$OutputFile = "C:\Users\Soham Patil\OneDrive - TECHVITS SOLUTIONS PRIVATE LIMITED\powershell_script\file_ips.txt"
$AllIPs = New-Object System.Collections.Generic.List[string]

# Convert IP address to integer
function Convert-IPToInt {
    param($IP)
    $bytes = $IP.Split('.') | ForEach-Object { [byte]$_ }
    return [BitConverter]::ToUInt32($bytes[3..0], 0)
}

# Convert integer to IP address
function Convert-IntToIP {
    param([uint32]$Int)
    $bytes = [BitConverter]::GetBytes($Int)
    return "$($bytes[3]).$($bytes[2]).$($bytes[1]).$($bytes[0])"
}

# Expand CIDR block to IPs
function Expand-CIDR {
    param([string]$CIDR)
    $split = $CIDR.Split('/')
    $ip = $split[0]
    $prefix = [int]$split[1]

    $start = Convert-IPToInt $ip
    $mask = ([math]::Pow(2, 32) - 1) - ([math]::Pow(2, 32 - $prefix) - 1)
    $network = $start -band [uint32]$mask
    $broadcast = $network + ([math]::Pow(2, 32 - $prefix) - 1)

    for ($i = $network; $i -le $broadcast; $i++) {
        $ipAddr = Convert-IntToIP $i
        Write-Host "CIDR IP : $ipAddr" -ForegroundColor Yellow
        $AllIPs.Add($ipAddr)
    }
}

# Process each line
Get-Content $InputFile | ForEach-Object {
    $line = $_.Trim()
    
    if ($line -match '/') {
        # CIDR block
        Write-Host "Processing CIDR: $line" -ForegroundColor Cyan
        Expand-CIDR $line
    } elseif ($line -match '-') {
        # IP range
        $parts = $line -split '-'
        $startIP = Convert-IPToInt $parts[0]
        $endIP = Convert-IPToInt $parts[1]
        Write-Host "Processing IP-Range : $line" -ForegroundColor Green

        for ($i = $startIP; $i -le $endIP; $i++) {
            $ipAddr = Convert-IntToIP $i
            Write-Host "Range IP : $ipAddr" -ForegroundColor Yellow
            $AllIPs.Add($ipAddr)
        }
    } else {
        # Single IP
        Write-Host "Processing Single IP: $line" -ForegroundColor Magenta
        $AllIPs.Add($line)
    }
}

# Output to file
$AllIPs | Set-Content $OutputFile
Write-Host "All IPs saved to: $OutputFile" -ForegroundColor Cyan