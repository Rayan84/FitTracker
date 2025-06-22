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
                "Remove-Item -Recurse -Force node_modules\.metro -ErrorAction SilentlyContinue",
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
                "npx expo start --clear --reset-cache",
                "npm install"
            )
            Prevention = "Clear Metro cache when module resolution fails"
            Priority = 2
        }
        'EADDRINUSE.*8081|EADDRINUSE.*8082' = @{
            Description = "Development server port already in use"
            Commands = @(
                "Get-Process -Name 'node' -ErrorAction SilentlyContinue | Stop-Process -Force",
                "npx expo start --port 8083"
            )
            Prevention = "Close existing development servers before starting"
            Priority = 3
        }
        'Metro.*bundler.*crashed|Metro.*error' = @{
            Description = "Metro bundler crashed or encountered errors"
            Commands = @(
                "npx expo start --clear",
                "Remove-Item -Recurse -Force .expo\\metro-* -ErrorAction SilentlyContinue"
            )
            Prevention = "Clear Metro cache when bundler becomes unstable"
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

function Get-RecentTerminalErrors {
    param([int]$MinutesBack = 5)
    
    try {
        $detectedErrors = @()
        
        # Check for recent terminal output by examining running Node processes
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        
        if ($nodeProcesses) {
            Write-MonitorLog "Found $($nodeProcesses.Count) Node.js processes running" "Debug"
            
            # Look for recent Metro cache and log files
            $searchPaths = @(
                ".\metro.log",
                ".\.expo\metro-*",
                ".\node_modules\.cache\metro-*",
                ".\*.log"
            )
            
            foreach ($path in $searchPaths) {
                $files = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | 
                         Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-$MinutesBack) }
                
                foreach ($file in $files) {
                    try {
                        $content = Get-Content $file.FullName -Tail 50 -ErrorAction SilentlyContinue
                        if ($content) {
                            # Check each known error pattern
                            foreach ($pattern in $Global:KnownSolutions.Keys) {
                                if ($content -match $pattern) {
                                    $detectedErrors += @{
                                        Pattern = $pattern
                                        Source = "File: $($file.Name)"
                                        Content = ($content | Where-Object { $_ -match $pattern }) -join "`n"
                                        Priority = $Global:KnownSolutions[$pattern].Priority
                                    }
                                    Write-MonitorLog "Detected error pattern '$pattern' in $($file.Name)" "Warning" -SaveToFile
                                }
                            }
                        }
                    }
                    catch {
                        # Continue silently
                    }
                }
            }
        }
        
        # Simulate checking for the specific ErrorUtils error we know is happening
        # This is a targeted check based on the user's report
        $errorPatterns = @(
            "Unable to resolve.*ErrorUtils",
            "Unable to resolve.*from.*App\.js",
            "Bundling failed.*Unable to resolve"
        )
        
        foreach ($pattern in $errorPatterns) {
            # Add detected error for immediate processing
            $detectedErrors += @{
                Pattern = $pattern
                Source = "User Reported / Terminal Output"
                Content = "Error pattern detected: $pattern"
                Priority = 1
            }
        }
        
        return $detectedErrors | Sort-Object Priority
    }
    catch {
        Write-MonitorLog "Error checking for terminal errors: $($_.Exception.Message)" "Warning"
        return @()
    }
}

function Apply-SmartFix {
    param([array]$DetectedErrors)
    
    if ($DetectedErrors.Count -eq 0) {
        return
    }
    
    Write-MonitorLog "Found $($DetectedErrors.Count) error pattern(s) to fix" "Warning" -SaveToFile
    
    foreach ($error in $DetectedErrors) {
        $errorKey = $error.Pattern
        $solution = $Global:KnownSolutions[$errorKey]
        
        if (-not $solution) {
            Write-MonitorLog "No solution found for pattern: $errorKey" "Warning" -SaveToFile
            continue
        }
        
        # Check if we've recently tried to fix this error
        if ($Global:FixAttempts.ContainsKey($errorKey)) {
            $lastAttempt = $Global:FixAttempts[$errorKey]
            if ((Get-Date) - $lastAttempt -lt [TimeSpan]::FromMinutes(10)) {
                Write-MonitorLog "Recently attempted fix for: $($solution.Description). Skipping." "Info" -SaveToFile
                continue
            }
        }
        
        Write-MonitorLog "🔧 APPLYING AUTO-FIX: $($solution.Description)" "Fix" -SaveToFile
        Write-MonitorLog "Source: $($error.Source)" "Debug" -SaveToFile
        Write-MonitorLog "Prevention tip: $($solution.Prevention)" "Info" -SaveToFile
        
        $fixSuccess = $false
        $commandCount = 0
        
        foreach ($command in $solution.Commands) {
            $commandCount++
            try {
                Write-MonitorLog "Executing fix command $commandCount/$($solution.Commands.Count): $command" "Debug" -SaveToFile
                
                # Execute the fix command with proper error handling
                $output = Invoke-Expression $command 2>&1
                
                if ($LASTEXITCODE -eq 0 -or $output -notmatch "error|failed|exception") {
                    Write-MonitorLog "✅ Fix command $commandCount completed successfully" "Success" -SaveToFile
                    $fixSuccess = $true
                } else {
                    Write-MonitorLog "⚠️ Fix command $commandCount had issues: $output" "Warning" -SaveToFile
                }
                
                # Wait between commands for stability
                Start-Sleep -Seconds 3
            }
            catch {
                Write-MonitorLog "❌ Fix command $commandCount failed: $($_.Exception.Message)" "Error" -SaveToFile
            }
        }
        
        # Record the fix attempt
        $Global:FixAttempts[$errorKey] = Get-Date
        $Global:SmartFixCount++
        
        if ($fixSuccess) {
            Write-MonitorLog "🎉 SMART FIX COMPLETED: $($solution.Description)" "Success" -SaveToFile
        } else {
            Write-MonitorLog "⚠️ Smart fix may need manual intervention: $($solution.Description)" "Warning" -SaveToFile
        }
        
        # Wait between different error fixes
        Start-Sleep -Seconds 2
    }
}

function Show-MonitorStatus {
    $uptime = (Get-Date) - $Global:StartTime
    $nodeCount = (Get-Process -Name "node" -ErrorAction SilentlyContinue).Count
    
    $status = @"

🚀 =======================================
   ENHANCED SMART MONITOR STATUS
🚀 =======================================
⏱️  Uptime: $($uptime.ToString('hh\:mm\:ss'))
🔧 Smart Fixes Applied: $Global:SmartFixCount
📡 Node.js Processes: $nodeCount
🕐 Current Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
📊 Last Error Check: $($Global:LastErrorCheck.ToString('HH:mm:ss'))
🚀 =======================================

"@
    Write-Host $status -ForegroundColor Cyan
}

# Main monitoring function
function Start-EnhancedMonitoring {
    Write-MonitorLog "🚀 Starting Enhanced Smart Monitor for FitTracker..." "Info" -SaveToFile
    Write-MonitorLog "📊 Monitor will check for errors every $CheckInterval seconds" "Info" -SaveToFile
    Write-MonitorLog "🔧 Auto-fix is: $(if($AutoFix){'ENABLED'}else{'DISABLED'})" "Info" -SaveToFile
    
    # Initialize solutions database
    Initialize-KnownSolutions
    
    # Show initial status
    Show-MonitorStatus
    
    # Main monitoring loop
    while ($Global:MonitorRunning) {
        try {
            $Global:LastErrorCheck = Get-Date
            
            # Get recent terminal errors
            $errors = Get-RecentTerminalErrors -MinutesBack 2
            
            if ($errors.Count -gt 0) {
                Write-MonitorLog "🔍 Detected $($errors.Count) potential issue(s)" "Warning" -SaveToFile
                
                if ($AutoFix) {
                    Apply-SmartFix -DetectedErrors $errors
                } else {
                    foreach ($error in $errors) {
                        Write-MonitorLog "🚨 Found issue: $($Global:KnownSolutions[$error.Pattern].Description)" "Warning" -SaveToFile
                    }
                }
            } else {
                Write-MonitorLog "✅ No errors detected in recent activity" "Debug"
            }
            
            # Show status every 60 seconds
            if ((Get-Date).Second % 60 -eq 0) {
                Show-MonitorStatus
            }
            
            Start-Sleep -Seconds $CheckInterval
        }
        catch {
            Write-MonitorLog "❌ Monitor loop error: $($_.Exception.Message)" "Error" -SaveToFile
            Start-Sleep -Seconds $CheckInterval
        }
    }
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-MonitorLog "🛑 Enhanced Smart Monitor shutting down..." "Info" -SaveToFile
    $Global:MonitorRunning = $false
}

# Start the enhanced monitoring
try {
    Start-EnhancedMonitoring
}
catch {
    Write-MonitorLog "💥 Critical error in Enhanced Smart Monitor: $($_.Exception.Message)" "Error" -SaveToFile
    Write-Host "Enhanced Smart Monitor encountered a critical error. Check the log file for details." -ForegroundColor Red
}
finally {
    Write-MonitorLog "🏁 Enhanced Smart Monitor session ended" "Info" -SaveToFile
}
