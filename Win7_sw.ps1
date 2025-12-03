# Registry base paths
$registryPaths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
)
$IP_Address     =       (Get-WmiObject Win32_NetworkAdapterConfiguration |
    Where-Object { $_.IPEnabled -eq $true -and $_.IPAddress } |
    ForEach-Object { $_.IPAddress } |
    Where-Object { $_ -notlike '169.254*' -and $_ -ne '127.0.0.1' }) -join ", "
$IP_Address = $IP_Address -join ", "
# List for storing software info
$softwareList = @()

foreach ($path in $registryPaths) {
    $subkeys = Get-ChildItem -Path $path -ErrorAction SilentlyContinue

    foreach ($subkey in $subkeys) {
        $props = Get-ItemProperty -Path $subkey.PSPath -ErrorAction SilentlyContinue

        if ($props.DisplayName) {
            # Initialize variables
            $serialNumber = ""
            $productId = ""
            $installDate = ""

            # Extract serial number inside { }
            foreach ($property in $props.PSObject.Properties) {
                if ($property.Value -is [string]) {
                    $match = [regex]::Match($property.Value, "\{([^}]+)\}")
                    if ($match.Success) {
                        $serialNumber = $match.Groups[1].Value
                        break
                    }
                }
            }

            # # Check multiple possible product ID property names
            # foreach ($pidName in @("ProductID", "ProductId", "PID")) {
            #     if ($props.PSObject.Properties[$pidName]) {
            #         $productId = $props.$pidName
            #         break
            #     }
            # }

            # Parse InstallDate if present in YYYYMMDD format
            if ($props.PSObject.Properties["InstallDate"]) {
                $rawDate = $props.InstallDate
                if ($rawDate -match "^\d{8}$") {
                    $installDate = [datetime]::ParseExact($rawDate, "yyyyMMdd", $null)
                }
                else {
                    $installDate = $rawDate
                }
            }

            $softwareList = @{
                Hostname     = $env:COMPUTERNAME
                IPAddress    = $IP_Address
                Status       = "OK"
                Remark       = "Success"
                Application_Name = $props.DisplayName
                Version      = $props.DisplayVersion
                Publisher    = $props.Publisher
            #    ProductID    = $productId
                SerialNumber = $serialNumber
                InstallDate  = $installDate
                RegistryPath = $subkey.Name
            }
            $ComputerInfoObject = New-Object PSObject -Property $softwareList
            $ComputerInfoObject
        }
    }
}
# Display results in table sorted by Name
#$softwareList | Sort-Object Name | Format-Table -AutoSize
# $softwareList

# Export results to CSV
#$softwareList | Export-Csv -Path "InstalledSoftware_FullDetails.csv" -NoTypeInformation