$outputlocation = $CURRENTDIR
$outputfilehw = $CSVoutputfilehw
$outputfilesw = $CSVoutputfilesw
$filenamehw = $outputlocation+$outputfilehw
$filenamesw = $outputlocation+$outputfilesw
Function CreateHWFileOutput
{
try {
    $Results | Select-Object `
    "HostName",
    "Status",
    "Remark",
    "Domain",
    #"DomainRole",
    "HypervisorPresent",
    "Manufactuter",
    "Model",
    "NumberOfLogicalProcessors",
    "NumberOfProcessors",
    "PartOfDomain",
    #"Roles",
    "SystemFamily",
    "SystemSKUNumber",
    "SystemType",
    "TotalPhysicalMemory (GB)",
    "Primary_UserName",
#
    "BootDevice",
    "BuildNumber",
    "Operating_System",
    #"CodeSet",
    #"CountryCode",
    "OS_InstallDate",
    "OS_Manufacturer",
    "License_Name",
    "License_Desc",
    "License_Product_Key",
    "Product_Key",
    #"MaxNumberOfProcesses",
    #"MaxProcessMemorySize (GB)",
    "OS_Name",
    #"NumberOfProcesses",
    #"NumberOfUsers",
    "OSArchitecture",
    "RegisteredUser",
    #"SerialNumber",
    "WindowsDirectory",
#
    "W32_CSP_Name",
    "W32_CSP_Vendor",
    "W32_CSP_Version",
#
    "CPU",
    "MaxClockSpeed(MHz)",
    "CurrentClockSpeed(MHz)",
    "Disks",
    "Number_of_Drives",
    "Drives",
    "Size_of_Drives",
    "Graphics_Card",
    "Network_Adapters",
    "MacAddress",
#    "Network_Adapters:MacAddress"
    "IP_Address",
#
    "Total_Sockets",
    "Total_Cores",
    "Cores_Per_Socket",
#
    "Last_Scan_Time" |

    Export-Csv -Path $filenamehw -NoTypeInformation
  #  $PATH = "D:\script_from_soham\JUNE\$file_name"
    Write-Output "Hardware Information CSV File Exported at: $filenamehw" 
}
catch {
    Write-Error "Failed to export CSV: $_"
}
}#Main Function CreateHWFileOutput Ends
Function CreateSWFileOutput
{
try {
    
$Results_sw | Select-Object `
    "Hostname",
    "IPAddress",
    "Status",
    "Remark",
    "Application_Name",
    "Version",
    "Publisher",
#    "ProductID",
    "SerialNumber",
    "InstallDate",
    "RegistryPath",
    "Last_Scan_Time" |

    Export-Csv -Path $filenamesw -NoTypeInformation
   
    Write-Output "Software Information CSV File Exported at: $filenamesw"
}
catch {
    Write-Error "Failed to export CSV: $_"
}
}#Function CreateSWFileOutput Ends 