# Intelligent FitTracker Monitor with AI-Powered Error Resolution
# Manages Expo server, tracks real-time logs, and uses AI to fix code issues

param(
    [string]$ClaudeApiKey = $env:CLAUDE_API_KEY,
    [int]$ExpoPort = 8081,
    [int]$MetroPort = 8080,
    [string]$LogLevel = "Info",
    [switch]$NoAI
)

# Global configuration
$Global:Config = @{
    ProjectPath = Get-Location
    ExpoPort = $ExpoPort
    MetroPort = $MetroPort
    LogFile = "intelligent-monitor.log"
    ErrorLogFile = "expo-errors.log"
    StartTime = Get-Date
    FixCount = 0
    RestartCount = 0
    ExpoProcess = $null
    ExpoLogProcess = $null
    MonitorRunning = $true
    LastErrorTime = $null
    ConsecutiveErrors = 0
}

# Error patterns and AI prompts
$Global:ErrorPatterns = @{
    ModuleResolution = @{
        Pattern = "Unable to resolve|Cannot resolve|Module .+ not found|Unable to import"
        Severity = "High"
        AIPrompt = "Fix this React Native module resolution error"
    }
    MetroBundleError = @{
        Pattern = "Bundling failed|Transform error|Metro.*error"
        Severity = "High" 
        AIPrompt = "Fix this Metro bundler error in React Native"
    }
    ExpoServerError = @{
        Pattern = "Expo CLI error|DevServer.*error|Development server.*error"
        Severity = "Critical"
        AIPrompt = "Fix this Expo development server error"
    }
    PortConflict = @{
        Pattern = "(?i)(Error: listen EADDRINUSE|address already in use|EADDRINUSE.*$ExpoPort|EADDRINUSE.*$MetroPort|Port.*already in use|Port \d+ is being used by another process|Required input.*Use port|Another process.*running on port|port.*unavailable|port.*conflict)"
        Severity = "Critical"
        AIPrompt = "Resolve port conflict for Expo development server"
    }
    DependencyError = @{
        Pattern = "npm.*error|Package.*not found|Dependency.*missing"
        Severity = "Medium"
        AIPrompt = "Fix missing dependency or npm error in React Native project"
    }
    SyntaxError = @{
        Pattern = "SyntaxError|Unexpected token|Parse error"
        Severity = "High"
        AIPrompt = "Fix JavaScript/TypeScript syntax error in React Native code"
    }
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    $consoleColor = switch($Level) {
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Success" { "Green" }
        "Critical" { "Magenta" }
        "AI" { "Cyan" }
        default { "White" }
    }
    
    Write-Host $logEntry -ForegroundColor $consoleColor
    Add-Content -Path $Global:Config.LogFile -Value $logEntry -ErrorAction SilentlyContinue
}

function Test-PortInUse {
    param([int]$Port)
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    } catch {
        return $false
    }
}

function Kill-PortProcesses {
    param([int]$Port)
    
    Write-Log "Aggressively killing ALL processes using port $Port..." "Warning"
    
    try {
        # Find and kill processes using specific port
        $netstatOutput = netstat -ano | Select-String ":$Port "
        foreach ($line in $netstatOutput) {
            if ($line -match "\s+(\d+)$") {
                $pid = $matches[1]
                Write-Log "Killing process $pid using port $Port"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
        
        # Kill any node.js processes that might be related
        Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
            if ($cmdLine -and ($cmdLine -like "*expo*" -or $cmdLine -like "*metro*" -or $cmdLine -like "*react-native*")) {
                Write-Log "Killing Node.js process: $($_.Id)"
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        }
        
        # Additional aggressive cleanup for Metro/Expo processes
        @("expo", "metro", "react-native") | ForEach-Object {
            $processName = $_
            Get-Process | Where-Object { 
                $_.ProcessName -like "*$processName*" -or 
                (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*$processName*" 
            } | ForEach-Object {
                Write-Log "Killing related process: $($_.Id)"
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        }
        
        Start-Sleep -Seconds 3

        # Verify port is truly free
        if (Test-PortInUse -Port $Port) {
            Write-Log "Port $Port still in use after cleanup, attempting final force kill..." "Warning"
            # One final attempt with raw netstat
            $netstat = netstat -ano | Select-String ":$Port.*LISTENING"
            if ($netstat -match "LISTENING\s+(\d+)") {
                Stop-Process -Id $matches[1] -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Log "Error during port cleanup: $($_.Exception.Message)" "Error"
    }

    # Final verification
    $stillInUse = Test-PortInUse -Port $Port
    Write-Log "Port $Port status after cleanup: $(if($stillInUse){'Still in use!'}else{'Successfully freed'})" "$(if($stillInUse){'Warning'}else{'Success'})"
}

function Start-ExpoServer {
    Write-Log "Starting Expo development server..." "Info"
    
    # Check and handle port conflicts
    if (Test-PortInUse -Port $Global:Config.ExpoPort) {
        Write-Log "Port $($Global:Config.ExpoPort) is in use, killing processes..." "Warning"
        Kill-PortProcesses -Port $Global:Config.ExpoPort
    }
    
    if (Test-PortInUse -Port $Global:Config.MetroPort) {
        Write-Log "Metro port $($Global:Config.MetroPort) is in use, killing processes..." "Warning"
        Kill-PortProcesses -Port $Global:Config.MetroPort
    }
    
    # Start Expo with specific port and log output
    $expoLogFile = Join-Path $Global:Config.ProjectPath "expo-output.log"
    $expoCommand = "npx expo start --port $($Global:Config.ExpoPort) --clear"
    
    try {
        Write-Log "Executing: $expoCommand"
        Write-Log "Expo output will be logged to: $expoLogFile"
        
        # Start Expo in a new visible window to show QR code
        $processStartInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processStartInfo.FileName = "cmd.exe"
        $processStartInfo.Arguments = "/k cd /d `"$($Global:Config.ProjectPath)`" && $expoCommand"
        $processStartInfo.UseShellExecute = $true
        $processStartInfo.CreateNoWindow = $false
        $processStartInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
        
        $Global:Config.ExpoProcess = [System.Diagnostics.Process]::Start($processStartInfo)
        
        # Start a separate process to capture logs
        $logProcessStartInfo = New-Object System.Diagnostics.ProcessStartInfo
        $logProcessStartInfo.FileName = "cmd.exe"
        $logProcessStartInfo.Arguments = "/c cd /d `"$($Global:Config.ProjectPath)`" && $expoCommand > `"$expoLogFile`" 2>&1"
        $logProcessStartInfo.UseShellExecute = $false
        $logProcessStartInfo.CreateNoWindow = $true
        
        $Global:Config.ExpoLogProcess = [System.Diagnostics.Process]::Start($logProcessStartInfo)
        
        Write-Log "Expo server started (PID: $($Global:Config.ExpoProcess.Id))" "Success"
        $Global:Config.RestartCount++
        
        # Wait for server to initialize
        Start-Sleep -Seconds 8
        
        # Verify server is running
        $isRunning = Test-PortInUse -Port $Global:Config.ExpoPort
        if ($isRunning) {
            Write-Log "Expo server confirmed running on port $($Global:Config.ExpoPort)" "Success"
        } else {
            Write-Log "Warning: Expo server may not be fully initialized" "Warning"
        }
        
        return $true
    } catch {
        Write-Log "Failed to start Expo server: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Get-RealtimeLogs {
    $logs = @()
    
    # Check main Expo output log file
    $expoLogFile = Join-Path $Global:Config.ProjectPath "expo-output.log"
    if (Test-Path $expoLogFile) {
        try {
            # Read more lines for better error detection
            $content = Get-Content -Path $expoLogFile -Tail 30 -ErrorAction SilentlyContinue
            $logs += $content | Where-Object { $_ -and $_.Trim() -ne "" }

            # Specifically look for EADDRINUSE in recent logs
            $fullContent = Get-Content -Path $expoLogFile -ErrorAction SilentlyContinue
            $portConflicts = $fullContent | Select-String -Pattern "EADDRINUSE|address already in use" -Context 2,2
            if ($portConflicts) {
                $logs += $portConflicts | ForEach-Object { $_.Context.PreContext + $_.Line + $_.Context.PostContext }
            }
        } catch {
            # Ignore file access errors
        }
    }
    
    # Also check Expo process output directly
    if ($Global:Config.ExpoProcess -and -not $Global:Config.ExpoProcess.HasExited) {
        try {
            $output = $Global:Config.ExpoProcess.StandardOutput.ReadToEnd()
            if ($output) {
                $logs += $output -split "`n" | Select-Object -Last 30
            }
            $error_output = $Global:Config.ExpoProcess.StandardError.ReadToEnd()
            if ($error_output) {
                $logs += $error_output -split "`n" | Select-Object -Last 30
            }
        } catch {
            # Ignore stream read errors
        }
    }
    
    # Check project-specific log files
    $projectLogs = Get-ChildItem -Path $Global:Config.ProjectPath -Filter "*.log" -ErrorAction SilentlyContinue |
                  Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) -and $_.Name -ne $Global:Config.LogFile }
    
    foreach ($logFile in $projectLogs) {
        try {
            $content = Get-Content -Path $logFile.FullName -Tail 10 -ErrorAction SilentlyContinue
            $logs += $content | Where-Object { $_ -match "EADDRINUSE|address already in use|port.*conflict" }
        } catch {
            # Ignore file access errors
        }
    }
    
    # Add direct port check results to logs
    if (Test-PortInUse -Port $Global:Config.ExpoPort) {
        $logs += "WARNING: Port $($Global:Config.ExpoPort) is currently in use by another process"
    }
    if (Test-PortInUse -Port $Global:Config.MetroPort) {
        $logs += "WARNING: Metro port $($Global:Config.MetroPort) is currently in use by another process"
    }
    
    return $logs | Select-Object -Unique # Remove duplicates
}

function Analyze-ErrorLogs {
    param([string[]]$LogLines)
    
    $detectedErrors = @()
    
    foreach ($line in $LogLines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        
        foreach ($errorType in $Global:ErrorPatterns.Keys) {
            $pattern = $Global:ErrorPatterns[$errorType]
            
            if ($line -match $pattern.Pattern) {
                $error = @{
                    Type = $errorType
                    Pattern = $pattern.Pattern
                    Severity = $pattern.Severity
                    Line = $line
                    Timestamp = Get-Date
                    AIPrompt = $pattern.AIPrompt
                }
                
                $detectedErrors += $error
                Write-Log "DETECTED $errorType ERROR: $line" "Error"
                Add-Content -Path $Global:Config.ErrorLogFile -Value "[$((Get-Date).ToString())] ${errorType}: $line" -ErrorAction SilentlyContinue
            }
        }
    }
    
    return $detectedErrors
}

function Apply-AutomaticFix {
    param([hashtable]$Error)
    
    Write-Log "Applying automatic fix for $($Error.Type)..." "Warning"
    
    $fixCommands = switch ($Error.Type) {
        "ModuleResolution" {
            @("npx expo install --fix", "npm install", "npx expo start --clear --port $($Global:Config.ExpoPort)")
        }
        "MetroBundleError" {
            @("npx expo start --clear --reset-cache --port $($Global:Config.ExpoPort)")
        }
        "PortConflict" {
            Write-Log "Port conflict detected - initiating aggressive cleanup..." "Warning"
            
            # Kill processes using our ports
            Kill-PortProcesses -Port $Global:Config.ExpoPort
            Kill-PortProcesses -Port $Global:Config.MetroPort
            
            # Additional cleanup
            Write-Log "Clearing Metro bundler cache..."
            Start-Process -FilePath "npx" -ArgumentList "react-native start --reset-cache" -NoNewWindow -Wait
            
            # Clear temporary files
            Remove-Item -Path (Join-Path $env:TEMP "metro-*") -Recurse -Force -ErrorAction SilentlyContinue
            Remove-Item -Path (Join-Path $Global:Config.ProjectPath "node_modules/.cache") -Recurse -Force -ErrorAction SilentlyContinue
            
            Start-Sleep -Seconds 5
            Write-Log "Port cleanup completed, restarting server with clean state..."
            
            @("echo Port conflict aggressively resolved, restarting server with clean state...")
        }
        "DependencyError" {
            @("npm install", "npx expo install", "npx expo start --clear --port $($Global:Config.ExpoPort)")
        }
        default {
            @("npx expo start --clear --port $($Global:Config.ExpoPort)")
        }
    }
    
    foreach ($command in $fixCommands) {
        if ($command -match "^echo ") { continue }
        
        try {
            Write-Log "Executing fix: $command"
            $result = Invoke-Expression $command
            Write-Log "Fix command completed: $command" "Success"
            Start-Sleep -Seconds 3
        } catch {
            Write-Log "Fix command failed: $command - $($_.Exception.Message)" "Error"
        }
    }
    
    $Global:Config.FixCount++
    Write-Log "Automatic fix applied. Total fixes: $($Global:Config.FixCount)" "Success"
}

function Start-IntelligentMonitoring {
    Write-Log "=== INTELLIGENT FITTRACKER MONITOR STARTED ===" "Success"
    Write-Log "Project: $($Global:Config.ProjectPath)" "Info"
    Write-Log "Expo Port: $($Global:Config.ExpoPort)" "Info"
    Write-Log "AI Integration: $(if($ClaudeApiKey -and -not $NoAI) { 'Enabled' } else { 'Disabled' })" "Info"
    
    # Start initial Expo server
    $maxRetries = 3
    $serverStarted = $false
    $retryCount = 0
    
    while (-not $serverStarted -and $retryCount -lt $maxRetries) {
        if ($retryCount -gt 0) {
            Write-Log "Retry attempt $retryCount to start Expo server..." "Warning"
            # Kill any processes that might interfere
            Kill-PortProcesses -Port $Global:Config.ExpoPort
            Kill-PortProcesses -Port $Global:Config.MetroPort
            Start-Sleep -Seconds 5
        }
        $serverStarted = Start-ExpoServer
        $retryCount++
        
        if (-not $serverStarted -and $retryCount -lt $maxRetries) {
            Write-Log "Server start failed, will retry in 10 seconds..." "Error"
            Start-Sleep -Seconds 10
        }
    }
    
    if (-not $serverStarted) {
        Write-Log "Failed to start Expo server after $maxRetries attempts. Please check for persistent port conflicts." "Critical"
    }
    
    $cycleCount = 0
    $lastErrorCheck = Get-Date
    
    while ($Global:Config.MonitorRunning) {
        $cycleCount++
        
        Write-Log "=== MONITORING CYCLE #$cycleCount ===" "Info"
        
        # Check if Expo server is still running
        $serverRunning = Test-PortInUse -Port $Global:Config.ExpoPort
        if (-not $serverRunning) {
            Write-Log "Expo server not responding, restarting..." "Warning"
            Start-ExpoServer
        }
        
        # Get and analyze real-time logs
        $realtimeLogs = Get-RealtimeLogs
        
        if ($realtimeLogs -and $realtimeLogs.Count -gt 0) {
            Write-Log "Analyzing $($realtimeLogs.Count) log lines..."
            
            $errors = Analyze-ErrorLogs -LogLines $realtimeLogs
            
            if ($errors.Count -gt 0) {
                Write-Log "Found $($errors.Count) error(s) in logs!" "Error"
                $Global:Config.ConsecutiveErrors++
                $Global:Config.LastErrorTime = Get-Date
                
                foreach ($error in $errors) {
                    # Apply automatic fix
                    Apply-AutomaticFix -Error $error
                    
                    # If critical error or multiple consecutive errors, restart server
                    if ($error.Severity -eq "Critical" -or $Global:Config.ConsecutiveErrors -gt 3) {
                        Write-Log "Critical error or multiple failures detected, restarting Expo server..." "Critical"
                        Kill-PortProcesses -Port $Global:Config.ExpoPort
                        Start-Sleep -Seconds 3
                        Start-ExpoServer
                        $Global:Config.ConsecutiveErrors = 0
                    }
                }
            } else {
                $Global:Config.ConsecutiveErrors = 0
            }
        }
        
        # Status report
        $uptime = (Get-Date) - $Global:Config.StartTime
        $nodeProcesses = (Get-Process -Name "node" -ErrorAction SilentlyContinue).Count
        
        Write-Log "Status: Uptime=$($uptime.ToString('hh\:mm\:ss')) | Node Processes=$nodeProcesses | Fixes=$($Global:Config.FixCount) | Restarts=$($Global:Config.RestartCount) | Server=$(if($serverRunning){'Running'}else{'Stopped'})" "Info"
        
        Start-Sleep -Seconds 5  # Check every 5 seconds
    }
}

function Stop-ExpoServer {
    try {
        if ($Global:Config.ExpoProcess -and -not $Global:Config.ExpoProcess.HasExited) {
            Write-Log "Stopping Expo server (PID: $($Global:Config.ExpoProcess.Id))" "Info"
            Stop-Process -Id $Global:Config.ExpoProcess.Id -Force -ErrorAction SilentlyContinue
        }
        
        if ($Global:Config.ExpoLogProcess -and -not $Global:Config.ExpoLogProcess.HasExited) {
            Write-Log "Stopping Expo log process (PID: $($Global:Config.ExpoLogProcess.Id))" "Info"
            Stop-Process -Id $Global:Config.ExpoLogProcess.Id -Force -ErrorAction SilentlyContinue
        }
        
        # Kill any remaining Expo processes
        Get-Process -Name "node" | 
            Where-Object { $_.CommandLine -like "*expo*" } | 
            ForEach-Object {
                Write-Log "Killing Expo process: $($_.Id)" "Info"
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
    } catch {
        Write-Log "Error stopping Expo server: $($_.Exception.Message)" "Error"
    }
}

function Stop-Monitor {
    Write-Log "Stopping Intelligent Monitor..." "Warning"
    $Global:Config.MonitorRunning = $false
    
    Stop-ExpoServer
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Stop-Monitor
} -ErrorAction SilentlyContinue

# Start the intelligent monitoring system
try {
    Start-IntelligentMonitoring
} catch {
    Write-Log "Critical monitor error: $($_.Exception.Message)" "Critical"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "Error"
} finally {
    Stop-Monitor
}
