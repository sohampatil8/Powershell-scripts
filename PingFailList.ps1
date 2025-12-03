$outputlocation = $CURRENTDIR
$outputfileping = $FailedOutputFilePing
$filenameping = $outputlocation+$outputfileping
Function PingFailed(){
try {
   
    $FailedResults | Select-Object `
    "Ping_Failed_HostName",
    "Ping_FaileD_Status",
    "Ping_Failed_Remarks",
    "Ping_Last_Scan_Time" |
    Export-Csv -Path $filenameping -NoTypeInformation
    #$PATH = "D:\script_from_soham\JUNE\$file_name"
    Write-Output "File Containing Failed Ping Systems Created: $filenameping"
}
catch {
    Write-Error "Failed write to Ping File $_"
}
}#Function Ends