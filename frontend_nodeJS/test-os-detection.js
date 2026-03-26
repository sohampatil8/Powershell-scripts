/**
 * test-os-detection.js
 *
 * Test script for OS-based device information extraction
 *
 * Usage:
 *   node test-os-detection.js <ip> <username> <password>
 *
 * Example:
 *   node test-os-detection.js 192.168.1.100 Administrator MyPass123
 */

const {
  testWindowsCredentials,
  extractDeviceInfo,
  extractWindowsSoftware,
} = require("./deviceInfo");

async function testOSDetection() {
  // Get credentials from command line arguments
  const [, , ip, username, password] = process.argv;

  if (!ip || !username || !password) {
    console.error(
      "❌ Usage: node test-os-detection.js <ip> <username> <password>",
    );
    console.error(
      "   Example: node test-os-detection.js 192.168.1.100 Administrator MyPass123",
    );
    process.exit(1);
  }

  console.log("\n🔍 Testing OS Detection and Script Execution");
  console.log("═".repeat(60));
  console.log(`Target: ${ip}`);
  console.log(`User: ${username}`);
  console.log("═".repeat(60));

  try {
    // Step 1: Test connection and detect OS
    console.log("\n1️⃣  Testing Windows connection and detecting OS...");
    const testResult = await testWindowsCredentials(ip, username, password);

    if (!testResult.success) {
      console.error(`❌ Connection failed: ${testResult.error}`);
      process.exit(1);
    }

    console.log(`✅ Connection successful!`);
    console.log(`   OS Detected: ${testResult.os}`);
    console.log(
      `   Script Type: ${testResult.os.toLowerCase().includes("windows 7") ? "Windows 7 (WMI)" : "Modern Windows (CIM)"}`,
    );

    // Step 2: Extract hardware information
    console.log("\n2️⃣  Extracting hardware information...");
    const hwInfo = await extractDeviceInfo({ ip, username, password });

    if (hwInfo.status === "success") {
      console.log(`✅ Hardware extraction successful!`);
      console.log(`   Script Used: ${hwInfo.parsed.script_used}`);
      console.log("\n   System Information:");
      console.log(`   ├─ Hostname: ${hwInfo.parsed.hostname}`);
      console.log(`   ├─ Manufacturer: ${hwInfo.parsed.manufacturer}`);
      console.log(`   ├─ Model: ${hwInfo.parsed.model}`);
      console.log(`   ├─ OS: ${hwInfo.parsed.os}`);
      console.log(`   ├─ Architecture: ${hwInfo.parsed.architecture}`);
      console.log(`   ├─ CPU: ${hwInfo.parsed.cpu}`);
      console.log(`   ├─ Memory: ${hwInfo.parsed.memory.total}`);
      console.log(`   ├─ Cores: ${hwInfo.parsed.cpu_cores}`);
      console.log(`   └─ IP: ${hwInfo.parsed.ip_addresses?.join(", ")}`);
    } else {
      console.error(`❌ Hardware extraction failed: ${hwInfo.error}`);
    }

    // Step 3: Extract software information
    console.log("\n3️⃣  Extracting software information...");
    const swInfo = await extractWindowsSoftware(
      ip,
      username,
      password,
      testResult.os,
    );

    if (swInfo.status === "success") {
      console.log(`✅ Software extraction successful!`);
      console.log(`   Script Used: ${swInfo.script_used}`);
      console.log(`   Total Software: ${swInfo.software_count}`);

      if (swInfo.software && swInfo.software.length > 0) {
        console.log("\n   Top 10 Installed Software:");
        swInfo.software.slice(0, 10).forEach((app, i) => {
          console.log(
            `   ${i + 1}. ${app.Name || "N/A"} (${app.Version || "N/A"})`,
          );
        });
      }
    } else {
      console.error(`❌ Software extraction failed: ${swInfo.error}`);
    }

    // Summary
    console.log("\n" + "═".repeat(60));
    console.log("✅ Test completed successfully!");
    console.log("═".repeat(60));
    console.log("\n💡 Tips:");
    console.log(
      "   • The correct script was automatically selected based on OS",
    );
    console.log("   • Windows 7 uses Get-WmiObject cmdlets");
    console.log("   • Modern Windows uses Get-CimInstance cmdlets");
    console.log(
      "   • Check the console logs for detailed script execution info\n",
    );
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testOSDetection().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
