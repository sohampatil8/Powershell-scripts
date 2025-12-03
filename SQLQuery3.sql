create table dbo.tblAssetSummary
(
asmAssetID	int 	not null,
asmHostName	nvarchar(10)	null,
asmStatus	nvarchar(10)	null,
asmRemark	nvarchar(10)	null,
asmDomain	nvarchar(10)	null,
asmNumberOfProcessors	int	null,
asmPartOfDomain	nvarchar(10)	null,
asmTotalPhysicalMemory int	null,
asmPrimary_UserName	nvarchar(10)	null,
asmBootDevice	nvarchar(10)	null,
asmBuildNumber	nvarchar(10)	null,
asmOperating_System	nvarchar(50)	null,
asmOS_Name	nvarchar(50)	null,
asmOSArchitecture	nvarchar(10)	null,
asmRegisteredUser	nvarchar(10)	null,
asmWindowsDirectory	nvarchar(10)	null,
asmGraphics_Card	nvarchar(10)	null,
asmTotal_Sockets	int	null,
asmTotal_Cores	int	null,
asmCores_Per_Socket	int	null,
asmLast_Scan_Time	datetime	null,
)

create table dbo.tblOS
(
osAssetID	int, 
osHostName	nvarchar(10),
osOS_InstallDate	datetime,
osOS_Manufacturer	nvarchar(10))


create table dbo.tblAssetHW
(
ahwAssetID	int,
ahwHostName	nvarchar(10),
ahwManufactuter	nvarchar(10),
ahwModel	nvarchar(10),
ahwW32_CSP_Name	nvarchar(10),
ahwW32_CSP_Vendor	nvarchar(10),
ahwW32_CSP_Version	nvarchar(10),
)

create table dbo.tblAssetProc
(
aprAssetID	int,
aprwHostName	nvarchar(10),
NumberOfLogicalProcessors	nvarchar(10),
NumberOfProcessors	nvarchar(10),
CPU	nvarchar(10),
MaxClockSpeed	nvarchar(10),
CurrentClockSpeed	nvarchar(10),
)
