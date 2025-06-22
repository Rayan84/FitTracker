# Advanced Real-Time FitTracker Monitor with Live Expo Output Analysis
# Monitors live Expo output and auto-fixes errors in real-time

param(
    [string]$ClaudeApiKey = $env:CLAUDE_API_KEY,
    [switch]$NoAI
)

# Configuration
$PROJECT_PATH = Get-Location
$LOG_FILE = Join-Path $PROJECT_PATH "advanced-monitor.log"
$ERROR_PATTERNS = @{
    "MODULE_RESOLUTION" = @(
        "Unable to resolve module",
        "Module not found",
        "Cannot resolve module"
    )
    "METRO_CACHE" = @(
        "Metro bundler cache",
        "Transform cache",
        "Cached data"
    )  
    "DEPENDENCY_MISSING" = @(
        "Module .+ not found",
        "Cannot find module",
        "Package .+ not found"
    )
    "EXPO_ERROR" = @(
        "Expo CLI error",
        "Failed to start development server",
        "DevServer error"
    )
}

$FIX_COMMANDS = @{
    "MODULE_RESOLUTION" = @(
        "npx expo install --fix",
        "npm install",
        "npx expo start --clear"
    )
    "METRO_CACHE" = @(
        "npx expo start --clear",
        "npx react-native start --reset-cache"
    )
    "DEPENDENCY_MISSING" = @(
        "npm install",
        "npx expo install",
        "npx expo start --clear"
    )
    "EXPO_ERROR" = @(
        "npx expo start --clear",
        "npm start"
    )
}

# Initialize
$script:StartTime = Get-Date
$script:FixCount = 0
$script:ExpoProcess = $null
$script:MonitorJob = $null

function Write-Log {
    param([string]$Message, [string]$Level = "Info")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry -ForegroundColor $(if($Level -eq "Error"){"Red"} elseif($Level -eq "Warning"){"Yellow"} else{"Green"})
    Add-Content -Path $LOG_FILE -Value $logEntry
}

function Test-ExpoRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8081" -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Start-ExpoInNewTerminal {
    Write-Log "Starting Expo in new terminal window..."
    
    # Kill any existing Expo processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -like "*expo*" -or $_.CommandLine -like "*expo*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Start Expo in a new terminal
    $expoCommand = "cd '$PROJECT_PATH'; npx expo start"
    $script:ExpoProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $expoCommand -PassThru
    
    Write-Log "Expo started in terminal (PID: $($script:ExpoProcess.Id))"
    Start-Sleep -Seconds 5  # Give Expo time to start
}

function Get-LiveExpoOutput {
    # Try to capture output from running Expo processes
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    $expoOutput = @()
    
    foreach ($process in $nodeProcesses) {
        try {
            # Check if this is an Expo process by examining command line
            $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            if ($commandLine -and $commandLine -like "*expo*") {
                # This is a basic approach - in practice, capturing live stdout is complex
                # We'll check common log locations and recent Metro logs instead
                $expoOutput += "Found Expo process: $($process.Id)"
            }
        } catch {
            # Ignore errors accessing process info
        }
    }
    
    # Check for Metro bundler logs (common location)
    $tempPath = $env:TEMP
    $metroLogs = Get-ChildItem -Path $tempPath -Filter "metro-*" -Directory -ErrorAction SilentlyContinue
    foreach ($logDir in $metroLogs) {
        $logFiles = Get-ChildItem -Path $logDir.FullName -Filter "*.log" -ErrorAction SilentlyContinue
        foreach ($logFile in $logFiles) {
            if ((Get-Date) - $logFile.LastWriteTime -lt [TimeSpan]::FromMinutes(5)) {
                try {
                    $recentContent = Get-Content -Path $logFile.FullName -Tail 10 -ErrorAction SilentlyContinue
                    $expoOutput += $recentContent
                } catch {
                    # Ignore file access errors
                }
            }
        }
    }
    
    return $expoOutput
}

function Analyze-ErrorOutput {
    param([string[]]$Output)
    
    $detectedErrors = @()
    
    foreach ($line in $Output) {
        foreach ($errorType in $ERROR_PATTERNS.Keys) {
            foreach ($pattern in $ERROR_PATTERNS[$errorType]) {
                if ($line -match $pattern) {
                    $detectedErrors += @{
                        Type = $errorType
                        Pattern = $pattern
                        Line = $line
                        Timestamp = Get-Date
                    }
                    Write-Log "Detected $errorType error: $line" -Level "Warning"
                }
            }
        }
    }
    
    return $detectedErrors
}

function Apply-AutoFix {
    param([string]$ErrorType)
    
    Write-Log "Applying auto-fix for $ErrorType..." -Level "Warning"
    
    if ($FIX_COMMANDS.ContainsKey($ErrorType)) {
        foreach ($command in $FIX_COMMANDS[$ErrorType]) {
            Write-Log "Executing fix command: $command"
            try {
                $result = Invoke-Expression $command
                Write-Log "Fix command completed: $command"
                Start-Sleep -Seconds 2
            } catch {
                Write-Log "Fix command failed: $command - $($_.Exception.Message)" -Level "Error"
            }
        }
        $script:FixCount++
        Write-Log "Auto-fix applied for $ErrorType (Total fixes: $script:FixCount)"
        return $true
    }
    
    return $false
}

function Send-ToClaudeAPI {
    param([string]$ErrorContext)
    
    if ($NoAI -or [string]::IsNullOrEmpty($ClaudeApiKey)) {
        Write-Log "Skipping AI analysis (No API key or NoAI flag set)"
        return $null
    }
    
    Write-Log "Sending error to Claude API for analysis..."
    
    $headers = @{
        "Content-Type" = "application/json"
        "x-api-key" = $ClaudeApiKey
        "anthropic-version" = "2023-06-01"
    }
    
    $body = @{
        model = "claude-3-5-sonnet-20241022"
        max_tokens = 1000
        messages = @(
            @{
                role = "user"
                content = "Analyze this React Native/Expo error and provide a fix command: $ErrorContext"
            }
        )
    } | ConvertTo-Json -Depth 3
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Method Post -Headers $headers -Body $body
        $suggestion = $response.content[0].text
        Write-Log "Claude API suggestion: $suggestion"
        return $suggestion
    } catch {
        Write-Log "Claude API request failed: $($_.Exception.Message)" -Level "Error"
        return $null
    }
}

function Start-RealTimeMonitoring {
    Write-Log "=== ADVANCED REAL-TIME MONITOR STARTED ==="
    Write-Log "Project: $PROJECT_PATH"
    Write-Log "Claude API: $(if($ClaudeApiKey) { 'Available' } else { 'Not available' })"
    
    # Start Expo if not running
    if (-not (Test-ExpoRunning)) {
        Start-ExpoInNewTerminal
        Start-Sleep -Seconds 10
    }
    
    $checkCount = 0
    while ($true) {
        $checkCount++
        $uptime = (Get-Date) - $script:StartTime
        
        Write-Log "=== REAL-TIME CHECK #$checkCount ==="
        
        # Get live output from Expo processes
        $liveOutput = Get-LiveExpoOutput
        
        if ($liveOutput -and $liveOutput.Count -gt 0) {
            Write-Log "Analyzing $($liveOutput.Count) lines of output..."
            
            # Analyze for errors
            $errors = Analyze-ErrorOutput -Output $liveOutput
            
            if ($errors.Count -gt 0) {
                Write-Log "Found $($errors.Count) error(s) in live output!" -Level "Warning"
                
                foreach ($error in $errors) {
                    $fixed = Apply-AutoFix -ErrorType $error.Type
                    
                    if (-not $fixed -and $ClaudeApiKey -and -not $NoAI) {
                        $aiSuggestion = Send-ToClaudeAPI -ErrorContext $error.Line
                        if ($aiSuggestion) {
                            Write-Log "AI suggested fix available" -Level "Info"
                        }
                    }
                }
                
                # Restart Expo after fixes
                Write-Log "Restarting Expo after applying fixes..."
                Start-ExpoInNewTerminal
            } else {
                Write-Log "No errors detected in current output"
            }
        }
        
        # Check if Expo is still running
        $expoRunning = Test-ExpoRunning
        if (-not $expoRunning) {
            Write-Log "Expo not responding, restarting..." -Level "Warning"
            Start-ExpoInNewTerminal
        }
        
        # Status update
        $nodeProcesses = (Get-Process -Name "node" -ErrorAction SilentlyContinue).Count
        Write-Log "Status: Uptime=$($uptime.ToString('hh\:mm')) | Node processes=$nodeProcesses | Fixes=$script:FixCount | Expo=$(if($expoRunning){'Running'}else{'Stopped'})"
        
        Start-Sleep -Seconds 3  # Check every 3 seconds
    }
}

# Cleanup on exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    if ($script:ExpoProcess -and -not $script:ExpoProcess.HasExited) {
        Write-Log "Cleaning up Expo process..."
        $script:ExpoProcess.Kill()
    }
    if ($script:MonitorJob) {
        Remove-Job $script:MonitorJob -Force
    }
}

# Start monitoring
try {
    Start-RealTimeMonitoring
} catch {
    Write-Log "Monitor crashed: $($_.Exception.Message)" -Level "Error"
    exit 1
}
