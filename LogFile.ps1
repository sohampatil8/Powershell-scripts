Function WriteToLogFile
{
   Param ([string]$logstring)
   $message = (Get-Date).ToString() + " - "+$logstring
    Add-content $Logfile -value $message
}
