/**
 * deviceInfo.js
 * Connects to remote hosts and collects comprehensive device information.
 * Supports both Windows (WinRM/PowerShell) and Linux (SSH) hosts.
 */

const { NodeSSH } = require("node-ssh");
const { spawn } = require("child_process");
const path = require("path");

// Define the path to PowerShell scripts (adjust based on your setup)
const POWERSHELL_SCRIPTS_DIR = path.join(__dirname, "Powershell-scripts-main");

// Script mapping based on OS type and scan method
const SCRIPTS = {
  // PowerShell/CIM scripts (default)
  WIN7_HW: path.join(POWERSHELL_SCRIPTS_DIR, "Win7_hard.ps1"),
  WIN7_SW: path.join(POWERSHELL_SCRIPTS_DIR, "Win7_sw.ps1"),
  WIN11_HW: path.join(POWERSHELL_SCRIPTS_DIR, "W32_Remote_hw.ps1"),
  WIN11_SW: path.join(POWERSHELL_SCRIPTS_DIR, "W32_Remote_sw.ps1"),

  // WMI PowerShell scripts (for compatibility and alternative method)
  WMI_HW: path.join(POWERSHELL_SCRIPTS_DIR, "WMI_Remote_hw.ps1"),
  WMI_SW: path.join(POWERSHELL_SCRIPTS_DIR, "WMI_Remote_sw.ps1"),

  // WMIC Batch scripts (PowerShell-independent, 100% reliable)
  WMIC_HW: path.join(POWERSHELL_SCRIPTS_DIR, "WMIC_Remote_hw.bat"),
  WMIC_SW: path.join(POWERSHELL_SCRIPTS_DIR, "WMIC_Remote_sw.bat"),
};

/**
 * Test Windows credentials using PowerShell Invoke-Command
 * Automatically falls back to Get-WmiObject for Windows 7
 */
async function testWindowsCredentials(ip, username, password) {
  return new Promise((resolve) => {
    // Escape special characters for PowerShell
    const escapedPassword = password.replace(/'/g, "''").replace(/`/g, "``");
    const escapedUsername = username.replace(/'/g, "''");

    const psScript = `
$ErrorActionPreference = 'Stop'
$SecurePassword = ConvertTo-SecureString '${escapedPassword}' -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential('${escapedUsername}', $SecurePassword)
try {
    # First try Get-CimInstance (Windows 8+)
    $result = Invoke-Command -ComputerName '${ip}' -Credential $Credential -ScriptBlock {
        try {
            (Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).Caption
        } catch {
            # Fallback to Get-WmiObject for Windows 7 and older
            (Get-WmiObject Win32_OperatingSystem).Caption
        }
    } -ErrorAction Stop
    Write-Output "SUCCESS:$result"
} catch {
    Write-Output "FAILED:$($_.Exception.Message)"
}
`;

    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      psScript,
    ]);

    let output = "";
    let errorOutput = "";

    ps.stdout.on("data", (data) => {
      output += data.toString();
    });

    ps.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ps.on("close", (code) => {
      if (output.includes("SUCCESS:")) {
        const os = output.split("SUCCESS:")[1].trim();
        resolve({ success: true, os, error: null });
      } else {
        const error =
          errorOutput || output.split("FAILED:")[1] || "Connection failed";
        resolve({ success: false, os: null, error: error.trim() });
      }
    });

    ps.on("error", (err) => {
      resolve({ success: false, os: null, error: err.message });
    });
  });
}

/**
 * Execute external PowerShell script on remote Windows host
 */
async function executeExternalScript(ip, username, password, scriptPath) {
  return new Promise((resolve) => {
    const escapedPassword = password.replace(/'/g, "''").replace(/`/g, "``");
    const escapedUsername = username.replace(/'/g, "''");
    const escapedScriptPath = scriptPath.replace(/\\/g, "\\\\");

    const psScript = `
$ErrorActionPreference = 'Stop'
$SecurePassword = ConvertTo-SecureString '${escapedPassword}' -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential('${escapedUsername}', $SecurePassword)
try {
    $result = Invoke-Command -ComputerName '${ip}' -Credential $Credential -FilePath '${escapedScriptPath}' -ErrorAction Stop
    $result | ConvertTo-Json -Depth 5
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`;

    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      psScript,
    ]);

    let output = "";
    let errorOutput = "";

    ps.stdout.on("data", (data) => {
      output += data.toString();
    });

    ps.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ps.on("close", () => {
      if (output.includes("ERROR:")) {
        const errorMsg =
          output.split("ERROR:")[1] ||
          errorOutput ||
          "Failed to execute script";

        // Enhance error message with troubleshooting hints
        let enhancedError = errorMsg.trim();

        // Detect common WMI errors and provide specific guidance
        if (enhancedError.includes("No Instance(s) Available")) {
          enhancedError = `WMI Error: No Instance(s) Available. 
          
Troubleshooting Steps:
1. Restart WMI service on target machine: Restart-Service Winmgmt -Force
2. Verify WMI repository: winmgmt /verifyrepository
3. Run diagnostic: .\\Powershell-scripts-main\\Test-WMI-Connection.ps1
4. Try alternative method: Use "WMIC" or "PowerShell (CIM)" instead

Common Causes:
- WMI service stopped/corrupted on target machine
- Insufficient permissions (needs Admin)
- Firewall blocking WMI access
- WMI repository corruption

See TROUBLESHOOTING-WMI-ERRORS.md for detailed fixes.`;
        } else if (enhancedError.includes("Access is denied")) {
          enhancedError = `WMI Error: Access Denied.
          
Solutions:
1. Use Administrator credentials
2. Add user to "Distributed COM Users" group
3. Check WMI namespace security
4. Verify WinRM is enabled: Enable-PSRemoting -Force

See TROUBLESHOOTING-WMI-ERRORS.md for details.`;
        } else if (enhancedError.includes("RPC server is unavailable")) {
          enhancedError = `Network Error: RPC server unavailable.
          
Solutions:
1. Enable WinRM: Enable-PSRemoting -Force
2. Configure trusted hosts: Set-Item WSMan:\\localhost\\Client\\TrustedHosts -Value "*" -Force
3. Check firewall settings
4. Verify target is reachable: Test-Connection ${ip}

See TROUBLESHOOTING-WMI-ERRORS.md for details.`;
        } else if (enhancedError.includes("Invalid class")) {
          enhancedError = `WMI Error: Invalid class (repository corruption).
          
Solutions:
1. Rebuild WMI repository: winmgmt /salvagerepository
2. Run repair script: .\\Powershell-scripts-main\\Fix-WMI-Service.ps1
3. Re-register MOF files

See TROUBLESHOOTING-WMI-ERRORS.md for details.`;
        }

        resolve({
          success: false,
          data: null,
          error: enhancedError,
        });
      } else {
        try {
          const data = JSON.parse(output);
          resolve({
            success: true,
            data: data,
            error: null,
          });
        } catch (err) {
          resolve({
            success: false,
            data: null,
            error: "Failed to parse script output: " + err.message,
          });
        }
      }
    });

    ps.on("error", (err) => {
      resolve({
        success: false,
        data: null,
        error: err.message,
      });
    });
  });
}

/**
 * Execute WMIC commands remotely (PowerShell-independent)
 * Uses Invoke-Command to run native WMIC on the remote machine
 * This method works even if PowerShell cmdlets are restricted on the target
 */
async function executeWMICCommands(ip, username, password) {
  return new Promise((resolve) => {
    const escapedPassword = password.replace(/'/g, "''").replace(/`/g, "``");
    const escapedUsername = username.replace(/'/g, "''");

    // PowerShell script that uses Invoke-Command to run pure WMIC commands
    const psScript = `
$ErrorActionPreference = 'Stop'
$SecurePassword = ConvertTo-SecureString '${escapedPassword}' -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential('${escapedUsername}', $SecurePassword)

try {
    $result = Invoke-Command -ComputerName '${ip}' -Credential $Credential -ScriptBlock {
        # Run WMIC commands directly - no PowerShell cmdlets needed on target
        $output = @{}
        
        # System Info
        $output.HostName = (wmic computersystem get Name /value | Select-String "Name=").ToString().Split('=')[1].Trim()
        $output.Domain = (wmic computersystem get Domain /value | Select-String "Domain=").ToString().Split('=')[1].Trim()
        $output.Manufacturer = (wmic computersystem get Manufacturer /value | Select-String "Manufacturer=").ToString().Split('=')[1].Trim()
        $output.Model = (wmic computersystem get Model /value | Select-String "Model=").ToString().Split('=')[1].Trim()
        $output.SystemType = (wmic computersystem get SystemType /value | Select-String "SystemType=").ToString().Split('=')[1].Trim()
        $output.TotalPhysicalMemory = (wmic computersystem get TotalPhysicalMemory /value | Select-String "TotalPhysicalMemory=").ToString().Split('=')[1].Trim()
        
        # OS Info
        $output.Operating_System = (wmic os get Caption /value | Select-String "Caption=").ToString().Split('=')[1].Trim()
        $output.OSArchitecture = (wmic os get OSArchitecture /value | Select-String "OSArchitecture=").ToString().Split('=')[1].Trim()
        $output.BuildNumber = (wmic os get BuildNumber /value | Select-String "BuildNumber=").ToString().Split('=')[1].Trim()
        $output.InstallDate = (wmic os get InstallDate /value | Select-String "InstallDate=").ToString().Split('=')[1].Trim()
        $output.RegisteredUser = (wmic os get RegisteredUser /value | Select-String "RegisteredUser=").ToString().Split('=')[1].Trim()
        
        # BIOS
        $output.SerialNumber = (wmic bios get SerialNumber /value | Select-String "SerialNumber=").ToString().Split('=')[1].Trim()
        $output.BIOSVersion = (wmic bios get Version /value | Select-String "Version=").ToString().Split('=')[1].Trim()
        
        # CPU
        $output.CPU = (wmic cpu get Name /value | Select-String "Name=" | Select-Object -First 1).ToString().Split('=')[1].Trim()
        $output.MaxClockSpeed = (wmic cpu get MaxClockSpeed /value | Select-String "MaxClockSpeed=" | Select-Object -First 1).ToString().Split('=')[1].Trim()
        $output.NumberOfCores = (wmic cpu get NumberOfCores /value | Select-String "NumberOfCores=" | Select-Object -First 1).ToString().Split('=')[1].Trim()
        $output.NumberOfLogicalProcessors = (wmic cpu get NumberOfLogicalProcessors /value | Select-String "NumberOfLogicalProcessors=" | Select-Object -First 1).ToString().Split('=')[1].Trim()
        
        # Memory
        $memoryGB = 0
        $memModules = wmic memorychip get Capacity /value | Select-String "Capacity="
        foreach ($mod in $memModules) {
            $cap = [int64]($mod.ToString().Split('=')[1].Trim())
            $memoryGB += $cap / 1GB
        }
        $output."TotalPhysicalMemory (GB)" = [math]::Round($memoryGB, 2)
        
        # Disk Drives
        $diskInfo = wmic diskdrive get Model,Size,Status /format:csv | Select-Object -Skip 1 | Where-Object { $_ -ne "" }
        $output.DiskDrives = @()
        foreach ($disk in $diskInfo) {
            if ($disk -match ",") {
                $parts = $disk.Split(',')
                if ($parts.Length -ge 3) {
                    $output.DiskDrives += @{
                        Model = $parts[1]
                        Size = if ($parts[2]) { [math]::Round([int64]$parts[2] / 1GB, 2) } else { 0 }
                        Status = $parts[3]
                    }
                }
            }
        }
        
        # Network Adapters
        $nicInfo = wmic nicconfig where IPEnabled=true get Description,MACAddress /format:csv | Select-Object -Skip 1 | Where-Object { $_ -ne "" }
        $output.NetworkAdapters = @()
        foreach ($nic in $nicInfo) {
            if ($nic -match ",") {
                $parts = $nic.Split(',')
                if ($parts.Length -ge 2) {
                    $output.NetworkAdapters += @{
                        Description = $parts[1]
                        MACAddress = $parts[2]
                    }
                }
            }
        }
        
        $output.ScanMethod = "WMIC"
        $output.PowerShellRequired = $false
        
        $output
    } -ErrorAction Stop
    
    $result | ConvertTo-Json -Depth 5
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`;

    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      psScript,
    ]);

    let output = "";
    let errorOutput = "";

    ps.stdout.on("data", (data) => {
      output += data.toString();
    });

    ps.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ps.on("close", () => {
      if (output.includes("ERROR:")) {
        const errorMsg =
          output.split("ERROR:")[1] ||
          errorOutput ||
          "Failed to execute WMIC commands";

        // Enhance error message with troubleshooting hints
        let enhancedError = errorMsg.trim();

        // Detect common WMIC/WMI errors and provide specific guidance
        if (enhancedError.includes("No Instance(s) Available")) {
          enhancedError = `WMIC Error: No Instance(s) Available.

Troubleshooting Steps:
1. Restart WMI service on target machine: Restart-Service Winmgmt -Force
2. Verify WMI repository: winmgmt /verifyrepository
3. Run diagnostic: .\\Powershell-scripts-main\\Test-WMI-Connection.ps1
4. Try alternative method: Use "PowerShell (CIM)" instead

Common Causes:
- WMI service stopped/corrupted on target machine
- Insufficient permissions (needs Admin)
- Firewall blocking WMI access
- WMI repository corruption

Note: WMIC still uses WMI underneath, just without PowerShell cmdlets.
See TROUBLESHOOTING-WMI-ERRORS.md for detailed fixes.`;
        } else if (enhancedError.includes("Access is denied")) {
          enhancedError = `WMIC Error: Access Denied.
          
Solutions:
1. Use Administrator credentials
2. Add user to "Distributed COM Users" group
3. Verify WinRM is enabled: Enable-PSRemoting -Force

See TROUBLESHOOTING-WMI-ERRORS.md for details.`;
        } else if (enhancedError.includes("RPC server is unavailable")) {
          enhancedError = `Network Error: RPC server unavailable.
          
Solutions:
1. Enable WinRM on target: Enable-PSRemoting -Force
2. Configure trusted hosts
3. Check firewall settings
4. Verify connectivity

See TROUBLESHOOTING-WMI-ERRORS.md for details.`;
        }

        resolve({
          success: false,
          data: null,
          error: enhancedError,
        });
      } else {
        try {
          const data = JSON.parse(output);
          resolve({
            success: true,
            data: data,
            error: null,
          });
        } catch (err) {
          resolve({
            success: false,
            data: null,
            error: "Failed to parse WMIC output: " + err.message,
          });
        }
      }
    });

    ps.on("error", (err) => {
      resolve({
        success: false,
        data: null,
        error: err.message,
      });
    });
  });
}

/**
 * Extract Windows device information using WMIC (PowerShell-independent)
 * This method works even if PowerShell cmdlets are disabled on the target
 */
async function extractWindowsInfoWMIC(ip, username, password) {
  console.log(`[${ip}] Using WMIC-based extraction (PowerShell-independent)`);

  const wmicResult = await executeWMICCommands(ip, username, password);

  if (!wmicResult.success) {
    return {
      status: "failed",
      error: wmicResult.error,
      parsed: {},
      raw: {},
    };
  }

  const data = wmicResult.data;

  // Map the WMIC output to our standard format
  return {
    status: "success",
    error: null,
    parsed: {
      // System Information
      hostname: data.HostName || "N/A",
      domain: data.Domain || "N/A",
      manufacturer: data.Manufacturer || "N/A",
      model: data.Model || "N/A",
      system_type: data.SystemType || "N/A",

      // Operating System
      os: data.Operating_System || "N/A",
      architecture: data.OSArchitecture || "N/A",
      build_number: data.BuildNumber || "N/A",
      install_date: data.InstallDate || "N/A",
      registered_user: data.RegisteredUser || "N/A",

      // Hardware IDs
      serial_number: data.SerialNumber || "N/A",
      bios_version: data.BIOSVersion || "N/A",

      // Processor
      cpu: data.CPU || "N/A",
      cpu_max_speed: data.MaxClockSpeed + " MHz" || "N/A",
      cpu_cores: data.NumberOfCores || 0,
      number_of_logical_processors: data.NumberOfLogicalProcessors || 0,

      // Memory
      memory: {
        total: data["TotalPhysicalMemory (GB)"] + " GB" || "N/A",
      },

      // Storage
      disk_drives: data.DiskDrives || [],

      // Network
      network_adapters: data.NetworkAdapters || [],

      // Metadata
      last_scan_time: new Date().toISOString(),
      scan_method: "WMIC",
      powershell_required: false,
    },
    raw: data,
  };
}

/**
 * Extract Windows device information using OS-specific PowerShell scripts
 */
async function extractWindowsInfo(ip, username, password, osVersion) {
  // Determine which script to use based on OS version
  const isWindows7 = osVersion && osVersion.toLowerCase().includes("windows 7");
  const hwScriptPath = isWindows7 ? SCRIPTS.WIN7_HW : SCRIPTS.WIN11_HW;

  console.log(
    `[${ip}] Using ${isWindows7 ? "Windows 7" : "Modern Windows"} hardware script`,
  );

  // Execute the hardware info script
  const hwResult = await executeExternalScript(
    ip,
    username,
    password,
    hwScriptPath,
  );

  if (!hwResult.success) {
    return {
      status: "failed",
      error: hwResult.error,
      parsed: {},
      raw: {},
    };
  }

  const data = hwResult.data;

  // Map the script output to our standard format
  return {
    status: "success",
    error: null,
    parsed: {
      // System Information
      hostname: data.HostName || "N/A",
      domain: data.Domain || "N/A",
      hypervisor_present: data.HypervisorPresent || false,
      manufacturer: data.Manufactuter || data.Manufacturer || "N/A",
      model: data.Model || "N/A",
      system_family: data.SystemFamily || "N/A",
      system_sku: data.SystemSKUNumber || "N/A",
      system_type: data.SystemType || "N/A",
      part_of_domain: data.PartOfDomain || false,

      // Operating System
      os: data.Operating_System || data.OperatingSystem || "N/A",
      os_manufacturer: data.OS_Manufacturer || "N/A",
      architecture: data.OSArchitecture || "N/A",
      build_number: data.BuildNumber || "N/A",
      install_date: data.OS_InstallDate?.toString() || "N/A",
      last_boot: data.LastBootUpTime?.toString() || "N/A",
      registered_user: data.RegisteredUser || "N/A",
      windows_directory: data.WindowsDirectory || "N/A",
      boot_device: data.BootDevice || "N/A",

      // Licensing
      license_name: data.License_Name || "N/A",
      license_description: data.License_Desc || "N/A",
      license_key: data.License_Product_Key || "N/A",

      // Hardware IDs
      serial_number: data.SerialNumber || "N/A",
      w32_csp_name: data.W32_CSP_Name || "N/A",
      w32_csp_vendor: data.W32_CSP_Vendor || "N/A",
      w32_csp_version: data.W32_CSP_Version || "N/A",

      // Processor
      cpu: data.CPU || "N/A",
      cpu_max_speed: data["MaxClockSpeed(MHz)"] + " MHz" || "N/A",
      cpu_current_speed: data["CurrentClockSpeed(MHz)"] + " MHz" || "N/A",
      cpu_sockets: data.Total_Sockets || 0,
      cpu_cores: data.Total_Cores || 0,
      cores_per_socket: data.Cores_Per_Socket || 0,
      number_of_processors: data.NumberOfProcessors || 0,
      number_of_logical_processors: data.NumberOfLogicalProcessors || 0,

      // Memory
      memory: {
        total: data["TotalPhysicalMemory (GB)"] + " GB" || "N/A",
        used: "N/A",
      },

      // Storage
      disks: data.Disks?.split("; ").map((d) => ({ info: d })) || [],
      number_of_drives: data.Number_of_Drives || 0,
      drives: data.Drives || "N/A",
      size_of_drives: data.Size_of_Drives || "N/A",

      // Graphics
      graphics_card: data.Graphics_Card || "N/A",

      // Network
      network_adapters: data.Network_Adapters || "N/A",
      network_interfaces:
        data.Network_Adapters?.split(", ").map((name, i) => ({
          name,
          ipv4: data.IP_Address?.split(", ")[i] || null,
          mac: data.MacAddress?.split(", ")[i] || null,
        })) || [],
      mac_addresses: data.MacAddress?.split(", ") || [],
      ip_addresses: data.IP_Address?.split(", ") || [],

      // User
      primary_username: data.Primary_UserName || "N/A",

      // Metadata
      last_scan_time: data.Last_Scan_Time || new Date().toISOString(),
      os_detection: isWindows7 ? "Windows 7" : "Modern Windows",
      script_used: path.basename(hwScriptPath),
    },
    raw: data,
  };
}

/**
 * Extract Windows device information using WMI-based PowerShell scripts
 * This method uses Get-WmiObject for better compatibility across Windows versions
 *
 * @param {string} ip - Target IP address
 * @param {string} username - Windows username
 * @param {string} password - Windows password
 * @returns {Promise<object>} Hardware extraction result
 */
async function extractWindowsInfoWMI(ip, username, password) {
  const hwScriptPath = SCRIPTS.WMI_HW;

  console.log(`[${ip}] Using WMI-based hardware script`);

  // Execute the hardware info script using WMI
  const hwResult = await executeExternalScript(
    ip,
    username,
    password,
    hwScriptPath,
  );

  if (!hwResult.success) {
    return {
      status: "failed",
      error: hwResult.error,
      parsed: {},
      raw: {},
    };
  }

  const data = hwResult.data;

  // Map the script output to our standard format
  return {
    status: "success",
    error: null,
    parsed: {
      // System Information
      hostname: data.HostName || "N/A",
      domain: data.Domain || "N/A",
      hypervisor_present: data.HypervisorPresent || false,
      manufacturer: data.Manufactuter || data.Manufacturer || "N/A",
      model: data.Model || "N/A",
      system_family: data.SystemFamily || "N/A",
      system_sku: data.SystemSKUNumber || "N/A",
      system_type: data.SystemType || "N/A",
      part_of_domain: data.PartOfDomain || false,

      // Operating System
      os: data.Operating_System || data.OperatingSystem || "N/A",
      os_manufacturer: data.OS_Manufacturer || "N/A",
      architecture: data.OSArchitecture || "N/A",
      build_number: data.BuildNumber || "N/A",
      install_date: data.OS_InstallDate?.toString() || "N/A",
      last_boot: data.LastBootUpTime?.toString() || "N/A",
      registered_user: data.RegisteredUser || "N/A",
      windows_directory: data.WindowsDirectory || "N/A",
      boot_device: data.BootDevice || "N/A",

      // Licensing
      license_name: data.License_Name || "N/A",
      license_description: data.License_Desc || "N/A",
      license_key: data.License_Product_Key || "N/A",

      // Hardware IDs
      serial_number: data.SerialNumber || "N/A",
      w32_csp_name: data.W32_CSP_Name || "N/A",
      w32_csp_vendor: data.W32_CSP_Vendor || "N/A",
      w32_csp_version: data.W32_CSP_Version || "N/A",

      // BIOS
      bios_version: data.BIOSVersion || "N/A",
      bios_manufacturer: data.BIOSManufacturer || "N/A",

      // Baseboard
      baseboard_manufacturer: data.BaseboardManufacturer || "N/A",
      baseboard_product: data.BaseboardProduct || "N/A",

      // Processor
      cpu: data.CPU || "N/A",
      cpu_max_speed: data["MaxClockSpeed(MHz)"] + " MHz" || "N/A",
      cpu_current_speed: data["CurrentClockSpeed(MHz)"] + " MHz" || "N/A",
      cpu_sockets: data.Total_Sockets || 0,
      cpu_cores: data.Total_Cores || 0,
      cores_per_socket: data.Cores_Per_Socket || 0,
      number_of_processors: data.NumberOfProcessors || 0,
      number_of_logical_processors: data.NumberOfLogicalProcessors || 0,

      // Memory
      memory: {
        total: data["TotalPhysicalMemory (GB)"] + " GB" || "N/A",
        slots: data.MemorySlots || 0,
        modules: data.MemoryModules || [],
      },

      // Storage
      disk_drives: data.DiskDrives || [],
      logical_drives: data.LogicalDrives || [],

      // Graphics
      graphics_card: data.VideoController || "N/A",
      video_ram: data.VideoRAM ? data.VideoRAM + " MB" : "N/A",

      // Network
      network_adapters: data.NetworkAdapters || [],

      // Metadata
      last_scan_time: new Date().toISOString(),
      scan_method: "WMI",
      script_used: path.basename(hwScriptPath),
    },
    raw: data,
  };
}

/**
 * Legacy Extract Windows device information using PowerShell WMI queries (inline script)
 * This is the old method - keeping for backwards compatibility
 */
async function extractWindowsInfoInline(ip, username, password) {
  return new Promise((resolve) => {
    // Escape special characters for PowerShell
    const escapedPassword = password.replace(/'/g, "''").replace(/`/g, "``");
    const escapedUsername = username.replace(/'/g, "''");

    const psScript = `
$ErrorActionPreference = 'Stop'
$SecurePassword = ConvertTo-SecureString '${escapedPassword}' -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential('${escapedUsername}', $SecurePassword)

try {
    $info = Invoke-Command -ComputerName '${ip}' -Credential $Credential -ScriptBlock {
        # Hardware Information
        $cs = Get-CimInstance Win32_ComputerSystem
        $os = Get-CimInstance Win32_OperatingSystem
        $csp = Get-CimInstance Win32_ComputerSystemProduct
        $processor = Get-CimInstance Win32_Processor | Select-Object -First 1
        $sockets = (Get-CimInstance Win32_Processor | Measure-Object).Count
        $totalCores = (Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfCores -Sum).Sum
        $disks = Get-CimInstance Win32_DiskDrive | ForEach-Object { "$($_.Model) ($([math]::Round($_.Size / 1GB, 2)) GB)" }
        $diskCount = (Get-CimInstance Win32_DiskDrive | Measure-Object).Count
        $drives = (Get-PSDrive -PSProvider FileSystem).Root -Join ", "
        $driveSizes = (Get-PSDrive -PSProvider FileSystem | ForEach-Object { 
            $total = ($_.Used + $_.Free) / 1GB 
            "$($_.Root) (Total: $([math]::Round($total, 2)) GB)" 
        }) -join ", "
        $graphics = (Get-CimInstance Win32_VideoController).Name -join ", "
        $ipAddrs = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
            $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' 
        }).IPAddress -join ", "
        $netAdapters = (Get-NetAdapter | Where-Object { $_.MacAddress }).Name -join ", "
        $macAddrs = (Get-NetAdapter | Where-Object { $_.MacAddress }).MacAddress -join ", "

        # License Information
        $licenseinfo = Get-CimInstance SoftwareLicensingProduct -Filter "Name LIKE 'Windows%' and ProductKeyId2 != NULL" | Select-Object -First 1
        $licenseName = if ($licenseinfo) { $licenseinfo.Name } else { "N/A" }
        $licenseDesc = if ($licenseinfo) { $licenseinfo.Description } else { "N/A" }
        $licenseKey = if ($licenseinfo) { $licenseinfo.ProductKeyID2 } else { "N/A" }

        # Software/Applications Installed
        $softwareList = @()
        
        # Get 64-bit software
        $software64 = Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName } |
            Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, PSPath
        
        # Get 32-bit software on 64-bit systems
        $software32 = Get-ItemProperty HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName } |
            Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, PSPath
        
        $allSoftware = $software64 + $software32
        
        foreach ($app in $allSoftware) {
            $softwareList += @{
                Name = $app.DisplayName
                Version = $app.DisplayVersion
                Publisher = $app.Publisher
                InstallDate = $app.InstallDate
                RegistryPath = $app.PSPath
            }
        }

        @{
            HostName = $cs.Name
            Domain = $cs.Domain
            HypervisorPresent = $cs.HypervisorPresent
            Manufacturer = $cs.Manufacturer
            Model = $cs.Model
            SystemFamily = $cs.SystemFamily
            SystemSKUNumber = $cs.SystemSKUNumber
            SystemType = $cs.SystemType
            PartOfDomain = $cs.PartOfDomain
            TotalPhysicalMemoryGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
            NumberOfProcessors = $cs.NumberOfProcessors
            NumberOfLogicalProcessors = $cs.NumberOfLogicalProcessors
            PrimaryUserName = $cs.UserName
            BootDevice = $os.BootDevice
            OperatingSystem = $os.Caption
            OSArchitecture = $os.OSArchitecture
            OSManufacturer = $os.Manufacturer
            BuildNumber = $os.BuildNumber
            OSInstallDate = $os.InstallDate
            LastBootUpTime = $os.LastBootUpTime
            RegisteredUser = $os.RegisteredUser
            WindowsDirectory = $os.WindowsDirectory
            LicenseName = $licenseName
            LicenseDesc = $licenseDesc
            LicenseKey = $licenseKey
            SerialNumber = $csp.IdentifyingNumber
            W32_CSP_Name = $csp.Name
            W32_CSP_Vendor = $csp.Vendor
            W32_CSP_Version = $csp.Version
            CPU = $processor.Name
            MaxClockSpeed = $processor.MaxClockSpeed
            CurrentClockSpeed = $processor.CurrentClockSpeed
            TotalSockets = $sockets
            TotalCores = $totalCores
            CoresPerSocket = if ($sockets -gt 0) { [math]::Round($totalCores / $sockets, 2) } else { 0 }
            Disks = $disks -join "; "
            NumberOfDrives = $diskCount
            Drives = $drives
            SizeOfDrives = $driveSizes
            GraphicsCard = $graphics
            NetworkAdapters = $netAdapters
            MacAddress = $macAddrs
            IPAddress = $ipAddrs
            InstalledSoftware = $softwareList
            SoftwareCount = $softwareList.Count
        }
    } -ErrorAction Stop

    # Convert to JSON for easy parsing
    $info | ConvertTo-Json -Depth 3
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`;

    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      psScript,
    ]);

    let output = "";
    let errorOutput = "";

    ps.stdout.on("data", (data) => {
      output += data.toString();
    });

    ps.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ps.on("close", () => {
      if (output.includes("ERROR:")) {
        const error =
          output.split("ERROR:")[1] || errorOutput || "Failed to extract info";
        resolve({
          status: "failed",
          error: error.trim(),
          parsed: {},
          raw: {},
        });
      } else {
        try {
          const data = JSON.parse(output);
          resolve({
            status: "success",
            error: null,
            parsed: {
              // System Information
              hostname: data.HostName,
              domain: data.Domain,
              hypervisor_present: data.HypervisorPresent,
              manufacturer: data.Manufacturer,
              model: data.Model,
              system_family: data.SystemFamily,
              system_sku: data.SystemSKUNumber,
              system_type: data.SystemType,
              part_of_domain: data.PartOfDomain,

              // Operating System
              os: data.OperatingSystem,
              os_manufacturer: data.OSManufacturer,
              architecture: data.OSArchitecture,
              build_number: data.BuildNumber,
              install_date: data.OSInstallDate?.toString() || "N/A",
              last_boot: data.LastBootUpTime?.toString() || "N/A",
              registered_user: data.RegisteredUser,
              windows_directory: data.WindowsDirectory,
              boot_device: data.BootDevice,

              // Licensing
              license_name: data.LicenseName,
              license_description: data.LicenseDesc,
              license_key: data.LicenseKey,

              // Hardware IDs
              serial_number: data.SerialNumber,
              w32_csp_name: data.W32_CSP_Name,
              w32_csp_vendor: data.W32_CSP_Vendor,
              w32_csp_version: data.W32_CSP_Version,

              // Processor
              cpu: data.CPU,
              cpu_max_speed: data.MaxClockSpeed + " MHz",
              cpu_current_speed: data.CurrentClockSpeed + " MHz",
              cpu_sockets: data.TotalSockets,
              cpu_cores: data.TotalCores,
              cores_per_socket: data.CoresPerSocket,
              number_of_processors: data.NumberOfProcessors,
              number_of_logical_processors: data.NumberOfLogicalProcessors,

              // Memory
              memory: {
                total: data.TotalPhysicalMemoryGB + " GB",
                used: "N/A",
              },

              // Storage
              disks: data.Disks?.split("; ").map((d) => ({ info: d })) || [],
              number_of_drives: data.NumberOfDrives,
              drives: data.Drives,
              size_of_drives: data.SizeOfDrives,

              // Graphics
              graphics_card: data.GraphicsCard,

              // Network
              network_adapters: data.NetworkAdapters,
              network_interfaces:
                data.NetworkAdapters?.split(", ").map((name, i) => ({
                  name,
                  ipv4: data.IPAddress?.split(", ")[i] || null,
                  mac: data.MacAddress?.split(", ")[i] || null,
                })) || [],
              mac_addresses: data.MacAddress?.split(", ") || [],
              ip_addresses: data.IPAddress?.split(", ") || [],

              // User
              primary_username: data.PrimaryUserName,

              // Software/Applications
              installed_software: data.InstalledSoftware || [],
              software_count: data.SoftwareCount || 0,
              system_type: data.SystemType,
              uptime: "N/A",
              timezone: "N/A",
            },
            raw: data,
          });
        } catch (err) {
          resolve({
            status: "failed",
            error: "Failed to parse response: " + err.message,
            parsed: {},
            raw: { output },
          });
        }
      }
    });

    ps.on("error", (err) => {
      resolve({
        status: "failed",
        error: err.message,
        parsed: {},
        raw: {},
      });
    });
  });
}

// Commands to run on the remote host
const COMMANDS = {
  hostname: "hostname",
  os: "uname -a 2>/dev/null || ver",
  os_release: 'cat /etc/os-release 2>/dev/null || echo "N/A"',
  cpu: 'lscpu 2>/dev/null || sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "N/A"',
  cpu_cores: 'nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "N/A"',
  memory_total: "free -h 2>/dev/null | awk '/^Mem:/{print $2}' || echo \"N/A\"",
  memory_used: "free -h 2>/dev/null | awk '/^Mem:/{print $3}' || echo \"N/A\"",
  disk: "df -h --output=source,size,used,avail,pcent,target 2>/dev/null | head -20 || df -h 2>/dev/null | head -20",
  network: 'ip addr show 2>/dev/null || ifconfig 2>/dev/null || echo "N/A"',
  mac_addresses:
    "ip link show 2>/dev/null | grep \"link/ether\" | awk '{print $2}' || ifconfig 2>/dev/null | grep ether | awk '{print $2}'",
  uptime: "uptime -p 2>/dev/null || uptime",
  users: 'who 2>/dev/null || echo "N/A"',
  processes_top:
    "ps aux --sort=-%cpu 2>/dev/null | head -10 || ps aux 2>/dev/null | head -10",
  open_ports:
    'ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null | head -20 || echo "N/A"',
  installed_pkgs:
    'dpkg -l 2>/dev/null | wc -l || rpm -qa 2>/dev/null | wc -l || echo "N/A"',
  last_logins: 'last -n 10 2>/dev/null || echo "N/A"',
  env_vars:
    'env 2>/dev/null | grep -E "^(PATH|SHELL|HOME|USER|LANG)" || echo "N/A"',
  timezone:
    'timedatectl 2>/dev/null | grep "Time zone" || date +%Z 2>/dev/null || echo "N/A"',
  kernel_version: 'uname -r 2>/dev/null || echo "N/A"',
  architecture: 'uname -m 2>/dev/null || echo "N/A"',
  bios_info:
    'sudo dmidecode -t bios 2>/dev/null | head -20 || echo "N/A (requires sudo)"',
  hardware_model:
    'sudo dmidecode -t system 2>/dev/null | grep -E "Manufacturer|Product Name|Version" || cat /sys/class/dmi/id/product_name 2>/dev/null || echo "N/A"',
};

/**
 * Run a single command over SSH.
 */
async function runCommand(ssh, cmd) {
  try {
    const result = await ssh.execCommand(cmd, { execOptions: { pty: false } });
    return (
      (result.stdout || "").trim() || (result.stderr || "").trim() || "N/A"
    );
  } catch {
    return "Error executing command";
  }
}

/**
 * Parse common device info fields into structured objects.
 */
function parseDeviceInfo(raw) {
  // Parse network interfaces from `ip addr` or `ifconfig`
  const interfaces = [];
  const ipBlocks = raw.network.split(/\n(?=\d+:|\w+:)/);
  for (const block of ipBlocks) {
    const nameMatch = block.match(/^\d+:\s+(\S+)|^(\S+)/);
    const ipMatch = block.match(/inet (\d+\.\d+\.\d+\.\d+)/);
    const ip6Match = block.match(/inet6 ([a-f0-9:]+)/i);
    if (nameMatch) {
      interfaces.push({
        name: (nameMatch[1] || nameMatch[2] || "").replace(":", ""),
        ipv4: ipMatch ? ipMatch[1] : null,
        ipv6: ip6Match ? ip6Match[1] : null,
      });
    }
  }

  // Parse disk usage
  const disks = [];
  const diskLines = raw.disk.split("\n").filter(Boolean);
  const diskHeader = diskLines[0];
  for (let i = 1; i < diskLines.length; i++) {
    const parts = diskLines[i].split(/\s+/);
    if (parts.length >= 6) {
      disks.push({
        source: parts[0],
        size: parts[1],
        used: parts[2],
        avail: parts[3],
        use_pct: parts[4],
        mount: parts[5],
      });
    }
  }

  return { interfaces, disks };
}

/**
 * Extract all device information from a single host.
 * Automatically tries Windows (WinRM) first, then SSH if Windows fails.
 * Supports osType and method selection for flexibility.
 *
 * @param {{ ip, username, password, port?, osType?, method? }} creds
 * @returns {object} Full device info object
 */
async function extractDeviceInfo(creds) {
  const {
    ip,
    username,
    password,
    port = 22,
    osType = "auto",
    method = "powershell",
  } = creds;

  const result = {
    ip,
    status: "connecting",
    timestamp: new Date().toISOString(),
    error: null,
    raw: {},
    parsed: {},
  };

  // If osType is explicitly set to windows or auto, try Windows first
  if (osType === "windows" || osType === "auto") {
    console.log(`[${ip}] Attempting Windows connection...`);
    const windowsTest = await testWindowsCredentials(ip, username, password);

    if (windowsTest.success) {
      console.log(
        `[${ip}] Windows connection successful, OS: ${windowsTest.os}`,
      );
      console.log(`[${ip}] Extracting info using ${method} method...`);

      let winInfo;

      // Choose extraction method based on user selection
      if (method === "wmi") {
        winInfo = await extractWindowsInfoWMI(ip, username, password);
      } else if (method === "wmic") {
        winInfo = await extractWindowsInfoWMIC(ip, username, password);
      } else {
        // Default to PowerShell/CIM method
        winInfo = await extractWindowsInfo(
          ip,
          username,
          password,
          windowsTest.os,
        );
      }

      if (winInfo.status === "success") {
        result.status = "success";
        result.parsed = winInfo.parsed;
        result.raw = winInfo.raw;
        result.method = `windows-${method}`;
        result.os_detected = windowsTest.os;
        result.scan_method = method.toUpperCase();
        return result;
      } else {
        result.error = `Windows extraction failed: ${winInfo.error}`;
      }
    } else {
      console.log(`[${ip}] Windows connection failed: ${windowsTest.error}`);

      // If osType is explicitly windows but connection failed, return error
      if (osType === "windows") {
        result.status = "failed";
        result.error = `Windows connection failed: ${windowsTest.error}`;
        return result;
      }
    }
  }

  // Try Linux/Unix via SSH if osType is linux or auto (and Windows failed)
  if (osType === "linux" || osType === "mac" || osType === "auto") {
    console.log(`[${ip}] Attempting SSH connection...`);
    const ssh = new NodeSSH();

    try {
      await ssh.connect({
        host: ip,
        username,
        password,
        port,
        readyTimeout: 10000,
        tryKeyboard: true,
        onKeyboardInteractive: (_name, _instr, _lang, prompts, finish) => {
          finish(prompts.map(() => password));
        },
      });

      console.log(`[${ip}] SSH connection successful, extracting info...`);
      result.status = "connected";

      // Run all commands in parallel for speed
      const cmdEntries = Object.entries(COMMANDS);
      const outputs = await Promise.all(
        cmdEntries.map(([key, cmd]) => runCommand(ssh, cmd)),
      );

      cmdEntries.forEach(([key], idx) => {
        result.raw[key] = outputs[idx];
      });

      // Build structured summary
      const parsed = parseDeviceInfo(result.raw);
      result.parsed = {
        hostname: result.raw.hostname,
        os: result.raw.os,
        os_release: result.raw.os_release,
        kernel: result.raw.kernel_version,
        architecture: result.raw.architecture,
        cpu: result.raw.cpu,
        cpu_cores: result.raw.cpu_cores,
        memory: {
          total: result.raw.memory_total,
          used: result.raw.memory_used,
        },
        uptime: result.raw.uptime,
        timezone: result.raw.timezone,
        hardware_model: result.raw.hardware_model,
        bios: result.raw.bios_info,
        network_interfaces: parsed.interfaces,
        mac_addresses: result.raw.mac_addresses.split("\n").filter(Boolean),
        disks: parsed.disks,
        open_ports: result.raw.open_ports,
        active_users: result.raw.users,
        top_processes: result.raw.processes_top,
        last_logins: result.raw.last_logins,
        installed_packages_count: result.raw.installed_pkgs,
      };

      result.status = "success";
      result.method = "linux-ssh";
    } catch (err) {
      result.status = "failed";
      result.error = `Both Windows and SSH failed. Last error: ${err.message}`;
      console.log(`[${ip}] All connection methods failed: ${err.message}`);
    } finally {
      try {
        ssh.dispose();
      } catch {}
    }
  }

  return result;
}

/**
 * Extract device info from multiple hosts (with credential map).
 *
 * @param {Array<{ ip, username, password, port? }>} hosts
 * @param {(progress: object) => void} onProgress
 */
async function extractMultiple(hosts, onProgress) {
  const results = [];
  let done = 0;

  // Process 5 hosts concurrently to avoid resource exhaustion
  const CONCURRENCY = 5;
  for (let i = 0; i < hosts.length; i += CONCURRENCY) {
    const batch = hosts.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(extractDeviceInfo));
    results.push(...batchResults);
    done += batch.length;
    if (onProgress) {
      onProgress({ done, total: hosts.length, latest: batchResults });
    }
  }

  return results;
}

/**
 * Extract Windows software information using OS-specific PowerShell scripts
 *
 * @param {string} ip - Target IP address
 * @param {string} username - Windows username
 * @param {string} password - Windows password
 * @param {string} osVersion - Detected OS version
 * @returns {Promise<object>} Software extraction result
 */
async function extractWindowsSoftware(ip, username, password, osVersion) {
  // Determine which script to use based on OS version
  const isWindows7 = osVersion && osVersion.toLowerCase().includes("windows 7");
  const swScriptPath = isWindows7 ? SCRIPTS.WIN7_SW : SCRIPTS.WIN11_SW;

  console.log(
    `[${ip}] Using ${isWindows7 ? "Windows 7" : "Modern Windows"} software script`,
  );

  // Execute the software info script
  const swResult = await executeExternalScript(
    ip,
    username,
    password,
    swScriptPath,
  );

  if (!swResult.success) {
    return {
      status: "failed",
      error: swResult.error,
      software: [],
      count: 0,
    };
  }

  const data = swResult.data;

  // Return software information
  return {
    status: "success",
    error: null,
    hostname: data.HostName || "N/A",
    os: data.Operating_System || "N/A",
    software: data.InstalledSoftware || [],
    software_count: data.SoftwareCount || 0,
    last_scan_time: data.Last_Scan_Time || new Date().toISOString(),
    os_detection: isWindows7 ? "Windows 7" : "Modern Windows",
    script_used: path.basename(swScriptPath),
  };
}

module.exports = {
  extractDeviceInfo,
  extractMultiple,
  testWindowsCredentials,
  executeExternalScript,
  executeWMICCommands,
  extractWindowsInfo,
  extractWindowsInfoWMI,
  extractWindowsInfoWMIC,
  extractWindowsSoftware,
};
