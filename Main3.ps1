#Script version 1.1 
#Script Date : 08-JULY-2025
# Define Editing file path (first file to import the variables:)
. "C:\Users\Soham Patil\OneDrive - TECHVITS SOLUTIONS PRIVATE LIMITED\Desktop\Git-PowershellScript\edit_file.ps1"
# DEFINE MAIN DIRECTORY WHERE ALL FILES ARE STORES
$CURRENTDIR= $CurrentFilesPath
# Define Credential file path
$Creds = $Crential_path
# Read Credentials from CSV File
. $CURRENTDIR\"ReadCredentials.ps1"
#Check Credentials for each asset
. $CURRENTDIR\"CheckCredentails.ps1"
#Create Output File for HW  Information 
. $CURRENTDIR\"CreateHWFile.ps1"
#Create Failed Ping List 
. $CURRENTDIR\"PingFailList.ps1"
#Log File Writing Process
. $CURRENTDIR\"LogFile.ps1"
#IP Ranges CIDR Format
. $CURRENTDIR\"ip-ranges-fun.ps1"
$InputFile = $CURRENTDIR+ "ip-range.txt"
$OutputFile = $CURRENTDIR+ "file_ips.txt"
$Log_File_Location = $CURRENTDIR+ "log_files\"
$timestamp = Get-Date -Format "ddMMyyyy_HHmmss"
$LogFile = $Log_File_Location+$timestamp+".log"
$Results = @()
$Results_sw = @()
$FailedResults = @()
#Windows 11 and New OS Remote HW Script
$Win11_hw = $CURRENTDIR + "W32_Remote_hw.ps1"
#Windows 11 and New OS Remote SW Script
$Win11_sw = $CURRENTDIR + "W32_Remote_sw.ps1"
#Windows 7 OS Remote HW Script
$Win7_hw = $CURRENTDIR + "Win7_hard.ps1"
#Windows 7 OS Remote OS Script
$Win7_sw = $CURRENTDIR + "Win7_sw.ps1"
#Windows 7 32biit OS Remote HW Script
$Win7_32bit_hw = $CURRENTDIR + "Win7_32bit_hard.ps1"
#Windows 7 32biit OS Remote OS Script
$Win7_32bit_sw = $CURRENTDIR + "Win7_32bit_sw.ps1"
WriteToLogFile("Script Execution Started")
WriteToLogFile("Read the IP Address Range File and Executing the CIDR Ranges Function ")
Get-IPsFromCIDRFile -InputFile $InputFile -OutputFile $OutputFile
$RemoteComputers = Get-Content -Path $CURRENTDIR"file_ips.txt"
$OSNAME=""
$fCCUserName=""
$fCCPassword=""
$MySecurePass=""
$ConnectionOSStatus=""
#Variable Declaration Ends ------------------------------------------------------------------
$rowcountm=ReadCredentialFile
WriteToLogFile("Credential File Read. Location of Credential File is $RemoteCred")
WriteToLogFile("Total Rows in Credential File is $rowcountm")
WriteToLogFile("IP Address File read")
foreach ($Computer in $RemoteComputers) #line forloop
{
$OSNAME=""
$ConnectionOSStatus =""
WriteToLogFile("Starting Ping Check Process for $Computer")
$pingResult = Test-Connection -ComputerName $Computer -Count 1 -Quiet -ErrorAction Stop
if ($pingResult -eq "TRUE")    
{
WriteToLogFile("Ping Success: $Computer ")
WriteToLogFile("Checking the Credentials. Calling CheckCredential Function for $Computer ")
#Write-Host "Ping Success : $Computer" -ForegroundColor Cyan
$OSNAME=CheckCredentials -IPAdd $Computer -frowcount $rowcountm
#write-host "OS Name from Check Cred Function:"  $OSNAME[0] "Status: " $OSNAME[1] " UserName: " $OSNAME[2] 
#write-host "Value:" $OSNAME[0]
$OSVALUE = $OSNAME[0]
write-host $OSVALUE
if ($OSName[1] -eq "Connected")
{
    $MySecureCredMain = $OSNAME[3]
    if($OSName[0] -like "*Windows 7*")
    {
        Write-Host "Windows 7 new"
       #If OS is Windows 7 , Call Windows 7 Scripts
        WriteToLogFile("Discovered Windows 7 OS. Running Scripts for Windows 7 using Credential $OSNAME[2]")
        $Info = Invoke-Command -ComputerName $Computer -FilePath $Win7_hw -Credential $MySecureCredMain -ErrorAction SilentlyContinue
        $sw   = Invoke-Command -ComputerName $Computer -FilePath $Win7_sw -Credential $MySecureCredMain -ErrorAction SilentlyContinue
        $Results += $Info
        $Results_sw += $sw
        WriteToLogFile("Execution of Scripts Completed for  Windows 7 OS.Credential $OSNAME[2]")
        write-host "Printing"
    }
    elseif ($OSNAME[0] -notlike "*Windows 7*")
    {
        #Write-Host "Non Windows 7"
        WriteToLogFile("Discovered Non Windows 7 OS. Running Scripts for Windows 7 using Credential $OSNAME[2]")
        $Info = Invoke-Command -ComputerName $Computer -FilePath $Win11_hw -Credential $MySecureCredMain -ErrorAction SilentlyContinue
        $sw   = Invoke-Command -ComputerName $Computer -FilePath $Win11_sw -Credential $MySecureCredMain -ErrorAction SilentlyContinue
        $Results += $Info
        $Results_sw += $sw
        WriteToLogFile("Execution of Scripts Completed for  Non-Windows 7 OS.Credential $OSNAME[2]")
    }
    # elseif ($OSNAME[0] -notlike "*Windows 7 32bit*")
    # {
    #     #Write-Host "Non Windows 7"
    #     WriteToLogFile("Discovered Non Windows 7 OS. Running Scripts for Windows 7 using Credential $OSNAME[2]")
    #     $Info = Invoke-Command -ComputerName $Computer -FilePath $Win7_32bit_hw -Credential $MySecureCredMain -ErrorAction SilentlyContinue
    #     $sw   = Invoke-Command -ComputerName $Computer -FilePath $Win7_32bit_sw -Credential $MySecureCredMain -ErrorAction SilentlyContinue
    #     $Results += $Info
    #     $Results_sw += $sw
    #     WriteToLogFile("Execution of Scripts Completed for  Non-Windows 7 OS.Credential $OSNAME[2]")
    # }
    #Non-Windows 7
    elseif ($OSVALUE -like "*ERROR*") 
    #else
    {
          
    }#Error

}#if osname is connected
else 
{
        WriteToLogFile("Error Connecting to Computer $Computer Using All Credentials.Refer to Remark Column")

        #Write-Host "IN ERROR ELSE IF"
           $ComputerInfo=""
       # Write-Host "Failed to run script on: $Computer" -ForegroundColor Red
        $ComputerInfo = [PSCustomObject]@{
        "HostName"       = $Computer
        "Status"         = "Failed"
        "Remark"         = $OSNAME[1]
        "Failed_Ping_Time" = (Get-Date).ToString('dd-MM-yyyy hh:mm:ss tt')}
        $Results += $ComputerInfo
}
}#if ping is true loop
else 
{
    #ping failed. Write Entry Ping Has Failed
        WriteToLogFile("Ping Failed for $Computer, Skipping the Scan. Entry created in Ping Failed List")

        Write-Host "Ping is failed for $Computer, Skipping the Scan" -ForegroundColor Red
            $PingFailed = [PSCustomObject]@{
            "Ping_Failed_HostName"       = $Computer;
            "Ping_Failed_Status"         = "Ping_Failed";
            "Ping_Failed_Remarks"         = "Unreachable";
            "Ping_Last_Scan_Time" = (Get-Date).ToString('dd-MM-yyyy hh:mm:ss tt')
            } #end of try
            [array]$FailedResults += $PingFailed
}#else ends for ping result
}#for loop ends 
WriteToLogFile("Calling Creation of HW and SW File Process")
# $Results
# $Results_sw
CreateHWFileOutput($Results)
CreateSWFileOutput($Results_sw)
WriteToLogFile("Calling Creation of Failed Ping List Process")
PingFailed
WriteToLogFile("Execution Completed. ")
