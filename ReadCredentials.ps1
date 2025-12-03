$RemoteCred = $Creds
$i=0
$CredCount = 0
$global:rowcount=0 
$global:obj= New-Object collections.arraylist
$global:Username=@()
$resultsos = ""
Function ReadCredentialFile()
{
$i=0
$CredCount = 0
Import-Csv -Path $RemoteCred | ForEach-Object {
$global:obj += $_

}
$rowcount = $global:obj.Count
#write-host "Total ROWS In Credential File : " $rowcount
#write-host $global:obj
 return $rowcount
 
}#Function 1 Ends