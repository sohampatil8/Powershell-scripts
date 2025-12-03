Function CheckCredentials()
{
 param (
        [string]$IPAdd,
        [int]$frowcount
        
    )  
    WriteToLogFile("Checking Various Credentials for Computer: $IPAdd Row Count--$frowcount")
    #write-host "Checking Various Credentials for Computer:" $IPAdd " Row Count-- " $frowcount
for ($i=0; $i -lt $frowcount; $i++)
{   $MySecurePassword=""
    $MySecurePass =""
    $TestosInfo =""
    $ConnectionOSStatus=""
    $lastval = $frowcount - 1
    write-host "IP--" $IPAdd
    write-host "username for i " $i "-" $global:obj[$i].UserName
    #write-host "password for i " $i "-" $global:obj[$i].Password
    write-host "password for i " $i "-" $MySecurePassword
    $fCCUserName = $global:obj[$i].UserName
    $MySecurePassword = ConvertTo-SecureString -AsPlainText $global:obj[$i].Password -Force
    $MySecurePass = $MySecurePassword
    $MySecureCredsList = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList  $fCCUserName, $MySecurePass
    WriteToLogFile("Secured Credentials")
    try
    {
        $ConnectionOSStatus ="ERROR"
        $TestosInfo="ERROR"
        # write-host "Trying Connection to:" $Computer "Using Credential" $i "UserName:" $fCCUserName 
        WriteToLogFile("Trying to Establish Connection using Username $fCCUserName")
        Write-Host "Trying to connect to $IPAdd with username: $($fCCUserName)"
    $TestosInfo = Invoke-Command -ComputerName $IPAdd -Credential $MySecureCredsList -ScriptBlock {
                (Get-WmiObject -Class Win32_OperatingSystem).Caption } -ErrorAction Stop
    if($TestosInfo)
    {
        $ConnectionOSStatus="Connected"
        Write-host "Connected to:" $Computer "Using UserName:" $fCCUserName -ForegroundColor Green
        WriteToLogFile("Connected to $Computer Using UserName: $fCCUserName")

        $resultsos =  $TestosInfo,$ConnectionOSStatus,$fCCUserName,$MySecureCredsList
       return $resultsos
    }    #if loop ends            
     
    }#try end
   catch {
        #Write-host "Error, Proceeding to Next Credentials"
        $ConnectionOSStatus ="ERROR" + $_.Exception.Message
        Write-Host "Connection failed: $($_.Exception.Message)"
        $TestosInfo="ERROR"
        Write-host "Error Connecting to:" $Computer "Using UserName:" $fCCUserName $TestosInfo -ForegroundColor Red
        WriteToLogFile("Error Connecting to $Computer Using UserName: $fCCUserName")
        if ($i -eq $lastval)
        {
            $resultsos =  $TestosInfo,$ConnectionOSStatus,$fCCUserName,$MySecureCredsList
            WriteToLoGFile("All Credentials Tested.Error Connecting Using All Crdentials")
            return $resultsos
        }
        
    }   
}#for end
  
}#function ends for check credentials
