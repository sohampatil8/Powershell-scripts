# Define connection parameters
$ServerInstance = "192.168.155.140" # Or just "YourServerName" for default instance
$DatabaseName = "ITAMSAM"
$Username = "sa"

# Prompt for password securely
$Password = Read-Host -AsSecureString -Prompt "Enter SQL Server password"

# Create a PSCredential object
$Credential = New-Object System.Management.Automation.PSCredential($Username, $Password)

# Create a SqlConnection object
$conn = New-Object System.Data.SqlClient.SqlConnection

# Set the connection string with SQL Server Authentication
$conn.ConnectionString = "Server=$ServerInstance;Database=$DatabaseName;User ID=$Username;Password=$($Credential.GetNetworkCredential().Password);"

# Open the connection
try {
    $conn.Open()
    Write-Host "Successfully connected to SQL Server using SQL Server Authentication."
    $SqlQuery = "SELECT * from dbo.tblAssetSummary;"  
    # Perform database operations here
    $SqlCmd = New-Object System.Data.SqlClient.SqlCommand  
    $SqlCmd.Commandtext = $SqlQuery
    $SqlCmd.Connection = $conn
    $SqlAdapter = New-Object System.Data.SqlClient.SqlDataAdapter  
    $SqlAdapter.SelectCommand = $SqlCmd 
    $DataSet = New-Object System.Data.DataSet  
    $SqlAdapter.Fill($DataSet)  
    $DataSet.Tables[0]  
}
catch {
    Write-Error "Failed to connect to SQL Server: $($_.Exception.Message)"
}
finally {
    # Close the connection
    if ($conn.State -eq 'Open') {
        $conn.Close()
        Write-Host "Connection closed."
    }
}