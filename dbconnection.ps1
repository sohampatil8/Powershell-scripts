function Invoke-SqlPooledQuery {
        param(
            [string]$ConnectionString,
            [string]$SqlQuery
        )

        $connection = New-Object System.Data.SqlClient.SqlConnection($ConnectionString)
        $command = New-Object System.Data.SqlClient.SqlCommand($SqlQuery, $connection)

        try {
            $connection.Open()
            $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($command)
            $dataSet = New-Object System.Data.DataSet
            $adapter.Fill($dataSet)
            return $dataSet.Tables[0]
        }
        catch {
            Write-Error "Error executing SQL query: $($_.Exception.Message)"
        }
        finally {
            if ($connection.State -eq 'Open') {
                $connection.Close() # This returns the connection to the pool
            }
            $connection.Dispose() # Disposes of the connection object, but the underlying connection might remain in the pool
        }
    }