$cs             =       (Get-WmiObject Win32_ComputerSystem)
$os             =       (Get-WmiObject Win32_OperatingSystem)
$csp            =       (Get-WmiObject Win32_ComputerSystemProduct)
$processor      =       (Get-WmiObject Win32_Processor)
$sockets        = ($processor | Select-Object -Property SocketDesignation | Measure-Object).Count
$TotalCores     = ($processor | Measure-Object -Property NumberOfCores -Sum).Sum
$os_installDateRaw = (Get-WmiObject Win32_OperatingSystem).InstallDate
$os_installDate1 = [System.Management.ManagementDateTimeConverter]::ToDateTime($os_installDateRaw)
$os_installDate = $os_installDate1.ToString("dd-MM-yyyy HH:mm:ss")
$Last_Scan_Time =       (Get-Date).ToString('dd-MM-yyyy hh:MM:ss tt')
#
$CPU            =       (Get-WmiObject Win32_Processor | Select-Object -ExpandProperty Name)
$Disks          =       (Get-WmiObject Win32_DiskDrive | ForEach-Object {"$($_.Model) ($([math]::Round($_.Size / 1GB, 2)) GB)"}) -join "; "
$Number_of_Drives =     (Get-PSDrive -PSProvider FileSystem).Count
$Drives         =       (Get-PSDrive -PSProvider FileSystem).Root -Join " , "
$Size_of_Drives =       (Get-PSDrive -PSProvider FileSystem | ForEach-Object { $total = ($_.Used + $_.Free) / 1GB 
                        "$($_.Root) (Total: $([math]::Round($total, 2)) GB)" }) -join ", "
$Graphics_Card  =       (Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name) -join ", "
#
$IP_Address     =       (Get-WmiObject Win32_NetworkAdapterConfiguration |
    Where-Object { $_.IPEnabled -eq $true -and $_.IPAddress } |
    ForEach-Object { $_.IPAddress } |
    Where-Object { $_ -notlike '169.254*' -and $_ -ne '127.0.0.1' }) -join ", "
$IP_Address = $IP_Address -join ", "
#
# # $NetworkAdapters =      Get-NetAdapter |
# #                              Where-Object { $_.MacAddress -ne $null } |
# #                              Select-Object Name, MacAddress | ForEach-Object { "$($_.Name) : $($_.MacAddress)"  -join "; " }
$NetworkAdapters = (Get-WmiObject Win32_NetworkAdapter | Where-Object { $_.MACAddress -ne $null } | ForEach-Object { $_.Name }) -join ", "
$MacAddress      = (Get-WmiObject Win32_NetworkAdapter | Where-Object { $_.MACAddress -ne $null } | ForEach-Object { $_.MACAddress }) -join ", "
#
#OEM INFO
$licenseinfo2 = Get-WmiObject -Query "SELECT * FROM SoftwareLicensingProduct WHERE Name LIKE 'Windows%'" | 
                Where-Object { $_.PartialProductKey -and $_.LicenseStatus -ne $null } | 
                Select-Object Name, Description, PartialProductKey, LicenseStatus, ProductKeyID
$LicenseName2         = if ($licenseinfo2) { $licenseinfo2.Name } else { "N/A" }
$LicenseDesc          = if ($licenseinfo2) { $licenseinfo2.Description } else { "N/A" }
$LicenseProductKeyID2  = (Get-WmiObject -Class Win32_OperatingSystem).SerialNumber
#
    $ComputerInfo = @{
        "HostName"                   = $cs.Caption
        "Status"                     = "OK"
        "Remark"                     = "Success"
        "Domain"                     = $cs.Domain
        "DomainRole"                 = $cs.DomainRole
        "HypervisorPresent"          = $cs.HypervisorPresent
        "Manufactuter"               = $cs.Manufacturer
        "Model"                      = $cs.Model
        "NumberOfLogicalProcessors"  = $cs.NumberOfLogicalProcessors
        "NumberOfProcessors"         = $cs.NumberOfProcessors
        "PartOfDomain"               = $cs.PartOfDomain
        "Roles"                      = $cs.Roles
        "SystemFamily"               = $cs.SystemFamily
        "SystemSKUNumber"            = $cs.SystemSKUNumber
        "SystemType"                 = $cs.SystemType
        "TotalPhysicalMemory (GB)"   = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
        "Primary_UserName"           = $cs.UserName
#
        "BootDevice"                 = $os.BootDevice
        "BuildNumber"                = $os.BuildNumber
        "Operating_System"           = $os.Caption
        "CodeSet"                    = $os.CodeSet
        "CountryCode"                = $os.CountryCode
        "OS_InstallDate"             = $os_installDate
        "OS_Manufacturer"            = $os.Manufacturer
        "License_Name"               = $LicenseName2
        "License_Desc"               = $LicenseDesc
        "License_Product_Key"        = $LicenseProductKeyID2
        #"MaxNumberOfProcesses"       = $os.MaxNumberOfProcesses
        #"MaxProcessMemorySize (GB)"  = [math]::Round($os.MaxProcessMemorySize / 1GB, 2)
        "OS_Name"                    = $os.Name
        #"NumberOfProcesses"          = $os.NumberOfProcesses
        #"NumberOfUsers"              = $os.NumberOfUsers
        "OSArchitecture"             = $os.OSArchitecture
        "RegisteredUser"             = $os.RegisteredUser
        #"SerialNumber"               = $os.SerialNumber
        "WindowsDirectory"           = $os.WindowsDirectory
#
        "W32_CSP_Name"               = $csp.Name
        "W32_CSP_Vendor"             = $csp.Vendor
        "W32_CSP_Version"            = $csp.Version
#
        "CPU"                        = $CPU
        "MaxClockSpeed(MHz)"         = $processor.MaxClockSpeed
        "CurrentClockSpeed(MHz)"     = $processor.CurrentClockSpeed
        "Disks"                      = $Disks
        "Size_of_Drives"             = $Size_of_Drives   
        "Number_of_Drives"           = $Number_of_Drives
        "Drives"                     = $Drives   
        "Graphics_Card"              = $Graphics_Card
        "Network_Adapters"           = $NetworkAdapters
        "MacAddress"                 = $MacAddress  
#       "Network_Adapters:MacAddress"= $NetworkAdapters
        "IP_Address"                 = $IP_Address
#
        "Total_Sockets"               = $sockets   
        "Total_Cores"                 = $TotalCores
        "Cores_Per_Socket"             = if ($sockets -gt 0) { [math]::Round($TotalCores / $sockets, 2) } else { 0 }     
#
        "Last_Scan_Time"             = $Last_Scan_Time
    }
    $ComputerInfoObject = New-Object PSObject -Property $ComputerInfo
    $ComputerInfoObject
#      return [PSCustomObject]$ComputerInfo