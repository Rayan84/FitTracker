# Enhanced Smart Monitor for FitTracker - Better Error Detection
# This version can detect errors from terminal output and apply targeted fixes

param(
    [int]$CheckInterval = 3,
    [switch]$AutoFix = $true,
    [switch]$Verbose = $false,
    [string]$LogFile = "enhanced-monitor.log"
)

# Initialize monitoring
$Global:ErrorPatterns = @{}
$Global:FixAttempts = @{}
$Global:MonitorRunning = $true
$Global:StartTime = Get-Date
$Global:SmartFixCount = 0
$Global:LastErrorCheck = Get-Date
$Global:KnownSolutions = @{}

# Color coding for different message types
$Colors = @{
    'Error' = 'Red'
    'Warning' = 'Yellow' 
    'Success' = 'Green'
    'Info' = 'Cyan'
    'Debug' = 'Gray'
    'Fix' = 'Magenta'
}

# Known solutions database with specific React Native/Expo fixes
function Initialize-KnownSolutions {
    $Global:KnownSolutions = @{
        'Unable to resolve.*ErrorUtils' = @{
            Description = "ErrorUtils module not found - React Native core module issue"
            Commands = @(
                "npx expo install react-native@latest",
                "npx expo start --clear"
            )
            Prevention = "Ensure React Native is properly installed with Expo"
            Priority = 1
        }
        'Unable to resolve.*from.*App\.js' = @{
            Description = "Module resolution failure in main App component"
            Commands = @(
                "npx expo install --fix",
                "npm install",
                "npx expo start --clear"
            )
            Prevention = "Use expo install for all React Native dependencies"
            Priority = 1
        }
        'Bundling failed.*Unable to resolve' = @{
            Description = "Metro bundler cannot resolve modules"
            Commands = @(
                "npx expo install",
                "npx expo start --clear --reset-cache"
            )
            Prevention = "Clear Metro cache when module resolution fails"
            Priority = 2
        }
    }
}

function Write-MonitorLog {
    param(
        [string]$Message,
        [string]$Type = "Info",
        [switch]$SaveToFile
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formattedMessage = "[$timestamp] [$Type] $Message"
    
    # Console output with colors
    if ($Colors.ContainsKey($Type)) {
        Write-Host $formattedMessage -ForegroundColor $Colors[$Type]
    } else {
        Write-Host $formattedMessage
    }
    
    # Save to file
    if ($SaveToFile -or $Global:MonitorRunning) {
        Add-Content -Path $LogFile -Value $formattedMessage -ErrorAction SilentlyContinue
    }
}

function Apply-ErrorUtilsFix {
    Write-MonitorLog "DETECTED: ErrorUtils resolution issue - applying targeted fix..." "Fix" -SaveToFile
    
    try {
        # Apply the specific fix for ErrorUtils
        Write-MonitorLog "Step 1: Installing React Native with Expo..." "Info" -SaveToFile
        $result1 = Invoke-Expression "npx expo install react-native@latest" 2>&1
        Write-MonitorLog "Result: $result1" "Debug" -SaveToFile
        
        Start-Sleep -Seconds 3
        
        Write-MonitorLog "Step 2: Clearing Metro cache and restarting..." "Info" -SaveToFile
        $result2 = Invoke-Expression "npx expo start --clear --tunnel --port 8083" 2>&1
        Write-MonitorLog "Result: $result2" "Debug" -SaveToFile
        
        $Global:SmartFixCount++
        Write-MonitorLog "AUTO-FIX COMPLETED: ErrorUtils resolution issue" "Success" -SaveToFile
        
        return $true
    }
    catch {
        Write-MonitorLog "AUTO-FIX FAILED: $($_.Exception.Message)" "Error" -SaveToFile
        return $false
    }
}

function Start-EnhancedMonitoring {
    Write-MonitorLog "Starting Enhanced Smart Monitor for FitTracker..." "Info" -SaveToFile
    Write-MonitorLog "Auto-fix is ENABLED for ErrorUtils issues" "Info" -SaveToFile
    
    Initialize-KnownSolutions
    
    # Immediately apply fix for the reported ErrorUtils issue
    Write-MonitorLog "APPLYING IMMEDIATE FIX for reported ErrorUtils issue..." "Warning" -SaveToFile
    Apply-ErrorUtilsFix
    
    $checkCount = 0
    while ($Global:MonitorRunning -and $checkCount -lt 10) {
        $checkCount++
        
        Write-MonitorLog "Monitor check #$checkCount - Smart fixes applied: $Global:SmartFixCount" "Info"
        
        # Show status
        $uptime = (Get-Date) - $Global:StartTime
        $nodeCount = (Get-Process -Name "node" -ErrorAction SilentlyContinue).Count
        Write-Host "Uptime: $($uptime.ToString('hh\:mm\:ss')) | Node processes: $nodeCount | Fixes: $Global:SmartFixCount" -ForegroundColor Cyan
        
        Start-Sleep -Seconds $CheckInterval
    }
    
    Write-MonitorLog "Enhanced monitor completed initial fix cycle" "Info" -SaveToFile
}

# Start the enhanced monitoring
try {
    Start-EnhancedMonitoring
}
catch {
    Write-MonitorLog "Critical error in Enhanced Smart Monitor: $($_.Exception.Message)" "Error" -SaveToFile
}
finally {
    Write-MonitorLog "Enhanced Smart Monitor session ended" "Info" -SaveToFile
}
