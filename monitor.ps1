# FitTracker Intelligent Monitor
# Manages Expo server, tracks real-time logs, and handles errors

param(
    [int]$ExpoPort = 8081,
    [int]$MetroPort = 8080
)

# Error patterns to detect
$Global:ErrorPatterns = @{
    "PORT_CONFLICT" = @{
        Pattern = "(?i)(Error: listen EADDRINUSE|address already in use|port.*already in use)"
        Severity = "Critical"
    }
    "METRO_ERROR" = @{
        Pattern = "Metro.*error|Error running JavaScript bundle|Failed to build JavaScript bundle|Metro.*Bundle.*failed"
        Severity = "High"
    }
    "MODULE_ERROR" = @{
        Pattern = "Unable to resolve module|Cannot find module|Module not found"
        Severity = "High"
    }
    "SYNTAX_ERROR" = @{
        Pattern = "SyntaxError|Unexpected token|Parse error"
        Severity = "High"
    }
    "REACT_NATIVE_ERROR" = @{
        Pattern = "Text strings must be rendered within a.*Text.*component|Component.*is not valid|Element type is invalid|Objects are not valid as a React child"
        Severity = "High"
    }
    "REFERENCE_ERROR" = @{
        Pattern = "ReferenceError|TypeError|Cannot read property|Cannot access before initialization"
        Severity = "Medium"
    }
    "NAVIGATION_ERROR" = @{
        Pattern = "The action.*was not handled|Navigation.*error|Screen.*not found"
        Severity = "Medium"
    }
}

# Get the computer's network IP address
function Get-NetworkIP {
    try {
        # Get the primary network adapter IP
        $networkIP = (Get-NetIPConfiguration | Where-Object { 
            $_.IPv4Address.IPAddress -match "^192\.168\." -or 
            $_.IPv4Address.IPAddress -match "^10\." -or 
            $_.IPv4Address.IPAddress -match "^172\." 
        } | Select-Object -First 1).IPv4Address.IPAddress
        
        if ($networkIP) {
            return $networkIP
        }
        
        # Fallback: use ipconfig
        $ipconfig = ipconfig | Select-String "IPv4.*: (192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)"
        if ($ipconfig) {
            $ip = ($ipconfig[0] -split ":")[1].Trim()
            return $ip
        }
        
        # Final fallback
        return "192.168.1.10"
    } catch {
        Write-Log "Error getting network IP: $_" "Warning"
        return "192.168.1.10"  # Default fallback
    }
}

# Find a free port starting from preferred port
function Find-FreePort {
    param(
        [int]$PreferredPort = 8081,
        [int]$MaxAttempts = 10
    )
    
    Write-Log "Looking for a free port starting from $PreferredPort..." "Info"
    
    $port = $PreferredPort
    $attempt = 0
    
    while ($attempt -lt $MaxAttempts) {
        if (-not (Test-PortInUse -Port $port)) {
            Write-Log "Found free port: $port" "Success"
            return $port
        }
        $port++
        $attempt++
    }
    
    Write-Log "Could not find free port after $MaxAttempts attempts" "Error"
    return $null
}

# Store port information persistently
function Save-PortConfig {
    param([int]$Port)
    
    $configPath = Join-Path $Global:Config.ProjectPath "expo-port.config"
    "$Port" | Set-Content -Path $configPath
}

function Get-SavedPort {
    $configPath = Join-Path $Global:Config.ProjectPath "expo-port.config"
    if (Test-Path $configPath) {
        return [int](Get-Content -Path $configPath)
    }
    return $null
}

function Test-PortInUse {
    param([int]$Port)
    
    try {
        # Method 1: Try to bind to the port (most reliable)
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        $listener.Stop()
        $bindResult = $false  # Port is free
    } catch {
        $bindResult = $true   # Port is in use
    }
    
    # Method 2: Check with netstat (backup verification)
    try {
        $netstatResult = (netstat -an | Select-String ":$Port " | Select-String "LISTENING").Count -gt 0
    } catch {
        $netstatResult = $false
    }
    
    # Return true if either method shows port is in use
    return ($bindResult -or $netstatResult)
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    $color = switch($Level) {
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Success" { "Green" }
        default { "White" }
    }
    
    Write-Host $logEntry -ForegroundColor $color
    if ($Global:Config -and $Global:Config.LogFile) {
        Add-Content -Path $Global:Config.LogFile -Value $logEntry
    }
}

# Configuration - placed after Write-Log function
$Global:Config = @{
    ProjectPath = Get-Location
    ExpoPort = $null  # Will be set to found free port
    MetroPort = $MetroPort
    LogFile = "monitor.log"
    ErrorLogFile = "expo-errors.log"
    StartTime = Get-Date
    FixCount = 0
    RestartCount = 0
    ExpoProcess = $null
    MonitorRunning = $true
}

# Initialize or restore port - with aggressive cleanup
$savedPort = Get-SavedPort
if ($savedPort) {
    Write-Log "Attempting to use saved Expo port: $savedPort" "Info"
    
    # ALWAYS clean up the saved port first, regardless of whether it appears in use
    if (Test-PortInUse -Port $savedPort) {
        Write-Log "Saved port $savedPort is in use, aggressively cleaning it up..." "Warning"
        $cleaned = Kill-PortProcesses -Port $savedPort
        Start-Sleep -Seconds 3
        
        if (-not (Test-PortInUse -Port $savedPort)) {
            $Global:Config.ExpoPort = $savedPort
            Write-Log "Successfully reclaimed saved Expo port: $savedPort" "Success"
        } else {
            Write-Log "Could not free saved port $savedPort, finding new port..." "Warning"
            $freePort = Find-FreePort -PreferredPort ($savedPort + 1)
            if ($freePort) {
                $Global:Config.ExpoPort = $freePort
                Save-PortConfig -Port $freePort
                Write-Log "Using new free port: $freePort" "Info"
            } else {
                throw "Could not find a free port for Expo server"
            }
        }
    } else {
        $Global:Config.ExpoPort = $savedPort
        Write-Log "Using saved Expo port: $savedPort (already free)" "Info"
    }
} else {
    $freePort = Find-FreePort -PreferredPort $ExpoPort
    if ($freePort) {
        $Global:Config.ExpoPort = $freePort
        Save-PortConfig -Port $freePort
        Write-Log "Using new free port: $freePort" "Info"
    } else {
        throw "Could not find a free port for Expo server"    }
}

function Kill-PortProcesses {
    param(
        [int]$Port,
        [switch]$KeepPort
    )
    
    Write-Log "Aggressively cleaning up port $Port..." "Warning"
    
    # Super aggressive approach - kill everything first, then verify
    try {
        # Step 1: Nuclear option - kill ALL node processes immediately
        Write-Log "Killing ALL Node.js processes..." "Warning"
        taskkill /F /IM node.exe /T 2>$null | Out-Null
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        
        # Step 2: Kill processes by port using netstat + taskkill
        $netstatOutput = cmd /c "netstat -ano" 2>$null
        $processes = @()
          foreach ($line in $netstatOutput) {
            if ($line -match ":$Port\s+" -and $line -match "\s(\d+)$") {
                $processId = $matches[1]
                if ($processId -ne "0" -and $processes -notcontains $processId) {
                    $processes += $processId
                    Write-Log "Found process $processId using port $Port" "Warning"
                }
            }
        }
        
        # Kill each process found
        foreach ($processId in $processes) {
            try {
                taskkill /F /PID $processId 2>$null | Out-Null
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Log "Killed process $processId" "Success"
            } catch {
                # Continue even if kill fails
            }
        }
        
        # Step 3: Kill any remaining CMD processes that might be running Expo 
        Get-Process -Name "cmd" -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
                if ($cmdLine -and ($cmdLine -like "*expo*" -or $cmdLine -like "*npx*")) {
                    Write-Log "Killing CMD process running Expo: $($_.Id)" "Warning"
                    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                }
            } catch {
                # Ignore errors
            }
        }
        
        # Step 4: Wait for cleanup to complete
        Start-Sleep -Seconds 3
        
        # Step 5: Final verification with multiple checks
        $portStillInUse = $false
        
        # Check via TCP test
        try {
            $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
            $listener.Start()
            $listener.Stop()
        } catch {
            $portStillInUse = $true
        }
        
        # Double-check via netstat
        $netstatCheck = netstat -an | Select-String ":$Port " | Select-String "LISTENING"
        if ($netstatCheck) {
            $portStillInUse = $true
        }
        
        if ($portStillInUse) {
            Write-Log "WARNING: Port $Port may still be in use after aggressive cleanup!" "Error"
            # One more nuclear attempt
            Write-Log "Final nuclear cleanup attempt..." "Error"
            taskkill /F /IM node.exe /T 2>$null | Out-Null
            taskkill /F /IM cmd.exe /T 2>$null | Out-Null
            Start-Sleep -Seconds 2
            return $false
        } else {
            Write-Log "Port $Port successfully freed" "Success"
            return $true
        }
        
    } catch {
        Write-Log "Error during aggressive port cleanup: $_" "Error"
        return $false
    }
}

function Start-ExpoServer {
    Write-Log "Starting Expo development server..." "Info"
    
    # Get network IP for phone connectivity
    $networkIP = Get-NetworkIP
    Write-Log "Using network IP: $networkIP" "Info"
    
    # IMMEDIATELY and aggressively clear the port before attempting to start
    Write-Log "Aggressively clearing port $($Global:Config.ExpoPort) before startup..." "Warning"
    $cleaned = Kill-PortProcesses -Port $Global:Config.ExpoPort
    
    # Double-check and wait with multiple retry attempts
    $attempts = 0
    while ((Test-PortInUse -Port $Global:Config.ExpoPort) -and $attempts -lt 15) {
        $attempts++
        Write-Log "Port $($Global:Config.ExpoPort) still in use after cleanup attempt $attempts, retrying..." "Warning"
        Kill-PortProcesses -Port $Global:Config.ExpoPort
        Start-Sleep -Seconds 3  # Longer wait between attempts
    }
    
    if (Test-PortInUse -Port $Global:Config.ExpoPort) {
        Write-Log "FAILED to free port $($Global:Config.ExpoPort) after $attempts attempts!" "Error"
        # Find an alternative port
        $newPort = Find-FreePort -PreferredPort ($Global:Config.ExpoPort + 1)
        if ($newPort) {
            Write-Log "Switching to alternative port: $newPort" "Warning"
            $Global:Config.ExpoPort = $newPort
            Save-PortConfig -Port $newPort
        } else {
            throw "Cannot find any free port for Expo server"
        }
    }
    
    # Also clear Metro port
    if (Test-PortInUse -Port $Global:Config.MetroPort) {
        Write-Log "Clearing Metro port $($Global:Config.MetroPort)..." "Warning"
        Kill-PortProcesses -Port $Global:Config.MetroPort
        Start-Sleep -Seconds 2
    }    # Start Expo with LAN host and specific port - EXPO GO MODE
    $expoLogFile = Join-Path $Global:Config.ProjectPath "expo-output.log"
    $expoCommand = "npx expo start --host lan --port $($Global:Config.ExpoPort) --clear"
    
    try {
        Write-Log "Running: $expoCommand" "Info"
        Write-Log "Expo server starting with QR code display enabled" "Success"
        Write-Log "Expo will be accessible via LAN at: exp://${networkIP}:$($Global:Config.ExpoPort)" "Success"
        Write-Log "QR code will be displayed immediately in CMD window - keep it open!" "Success"
        Write-Log "Use Expo Go app on your phone to scan the QR code!" "Info"
        Write-Log "Logging Expo output to: $expoLogFile" "Info"
          # Clear the log file before starting
        if (Test-Path $expoLogFile) {
            Remove-Item $expoLogFile -Force -ErrorAction SilentlyContinue
        }
        
        # Start Expo with proper output redirection using PowerShell
        $powershellScript = Join-Path $Global:Config.ProjectPath "start-expo-with-logging.ps1"
          $psContent = @"
Set-Location '$($Global:Config.ProjectPath)'
Write-Host '[MONITOR] Starting Expo server with QR code display...'
Write-Host ''
Write-Host 'IMPORTANT: QR code will appear immediately - scan with Expo Go app!'
Write-Host 'No need to press any keys - QR display is automatic!'
Write-Host ''
Write-Host 'Starting Expo server...'

# Start Expo and capture both output and display in terminal
& cmd /c "$expoCommand 2>&1" | Tee-Object -FilePath "$expoLogFile"
"@
        
        $psContent | Out-File -FilePath $powershellScript -Encoding UTF8 -Force
        
        $processStartInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processStartInfo.FileName = "powershell.exe"
        $processStartInfo.Arguments = "-ExecutionPolicy Bypass -File `"$powershellScript`""
        $processStartInfo.UseShellExecute = $true
        $processStartInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
        
        $Global:Config.ExpoProcess = [System.Diagnostics.Process]::Start($processStartInfo)
        
        $Global:Config.RestartCount++
        
        Write-Log "Expo server started (PID: $($Global:Config.ExpoProcess.Id))" "Success"
        Write-Log "QR code should appear immediately in the CMD window!" "Success"
        Write-Log "IMPORTANT: Use Expo Go app to scan QR, not your camera app!" "Warning"
        Write-Log "If you don't have Expo Go: Download it from App Store/Google Play" "Warning"
        
        # Wait for Expo to initialize before continuing
        Start-Sleep -Seconds 8
        return $true
        
    } catch {
        Write-Log "Failed to start Expo server: $_" "Error"
        return $false
    }
}

function Get-RealtimeLogs {
    $logs = @()
      # Method 1: Read actual Expo server output log (MAIN SOURCE FOR ERRORS)
    $expoLogFile = Join-Path $Global:Config.ProjectPath "expo-output.log"
    if (Test-Path $expoLogFile) {
        try {
            # Get file size to track changes
            $logFileInfo = Get-Item $expoLogFile
            $currentSize = $logFileInfo.Length
            
            # Read last 100 lines from the expo output log for better error detection
            $recentLines = Get-Content -Path $expoLogFile -Tail 100 -ErrorAction SilentlyContinue
            foreach ($line in $recentLines) {
                if ($line -and $line.Trim() -ne "") {
                    # Enhanced pattern matching for React Native and Metro errors
                    if ($line -match "(Error|ERROR|Failed|FAILED|Exception|exception|Warning.*Failed|Cannot|Unable|Unexpected|SyntaxError|ReferenceError|TypeError|Metro.*Bundle.*failed|Metro.*error|Text strings must be rendered|Component.*is not valid|Invariant Violation|Element type is invalid|Objects are not valid as a React child|Transform error|Bundling failed|Unable to resolve module)" -and 
                        $line -notmatch "^\[MONITOR\]" -and 
                        $line -notmatch "LogBox" -and
                        $line -notmatch "Download.*from App Store") {
                        
                        # Extract timestamp if present
                        $timestamp = ""
                        if ($line -match "\d{2}:\d{2}:\d{2}") {
                            $timestamp = " [$(Get-Date -Format 'HH:mm:ss')]"
                        }
                        
                        $logs += "EXPO_ERROR$timestamp : $line"
                    }
                    
                    # Also capture Metro compilation status
                    if ($line -match "(Bundling|Building JavaScript bundle|Metro.*waiting|Reloading|Fast Refresh)" -and 
                        $line -notmatch "^\[MONITOR\]") {
                        $logs += "EXPO_STATUS: $line"
                    }
                }
            }
            
            # Log file size for debugging
            if ($currentSize -gt 0) {
                Write-Log "Expo log file size: $($currentSize) bytes, checked $(($recentLines | Measure-Object).Count) recent lines" "Info"
            }
        } catch {
            Write-Log "Error reading Expo log file: $_" "Warning"
        }
    } else {
        Write-Log "Expo log file not found at: $expoLogFile" "Warning"
    }
    
    # Method 2: Check Metro bundler cache directory for recent errors
    try {
        $homeDir = [Environment]::GetFolderPath("UserProfile")
        $metroCacheDir = Join-Path $homeDir ".metro"
        if (Test-Path $metroCacheDir) {
            $recentTime = (Get-Date).AddMinutes(-5)
            $metroFiles = Get-ChildItem -Path $metroCacheDir -Recurse -Filter "*.log" -ErrorAction SilentlyContinue |
                         Where-Object { $_.LastWriteTime -gt $recentTime }
            
            foreach ($file in $metroFiles) {
                try {
                    $content = Get-Content -Path $file.FullName -Tail 20 -ErrorAction SilentlyContinue
                    foreach ($line in $content) {
                        if ($line -match "(Error|Failed|Exception|SyntaxError|TypeError|ReferenceError)") {
                            $logs += "METRO_CACHE: $line"
                        }
                    }
                } catch {
                    # Ignore file access errors
                }
            }
        }
    } catch {
        # Ignore metro cache access errors
    }
    
    # Method 3: Monitor the actual CMD window output by checking for common Node.js error patterns
    try {
        # Look for Node.js processes and check their command lines for error indicators
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        foreach ($proc in $nodeProcesses) {
            try {
                $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
                if ($cmdLine -and ($cmdLine -like "*expo*" -or $cmdLine -like "*metro*")) {
                    # Check if this process is consuming high CPU (could indicate errors)
                    if ($proc.CPU -gt 50) {
                        $logs += "HIGH_CPU: Expo/Metro process (PID: $($proc.Id)) using high CPU: $($proc.CPU)%"
                    }
                    
                    # Check if the process is not responding
                    if ($proc.Responding -eq $false) {
                        $logs += "NOT_RESPONDING: Expo Node process (PID: $($proc.Id)) is not responding"
                    }
                }
            } catch {
                # Ignore command line access errors
            }
        }
    } catch {
        # Ignore process enumeration errors
    }
    
    # Method 4: Check Windows Event Log for Node.js/Expo errors
    try {
        $recentTime = (Get-Date).AddMinutes(-2)
        Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=$recentTime} -MaxEvents 50 -ErrorAction SilentlyContinue | 
        Where-Object { $_.Message -match "EADDRINUSE|address already in use|expo|metro|node\.js" } | 
        ForEach-Object { $logs += "SYSTEM EVENT: $($_.Message)" }
    } catch {
        # Ignore event log errors
    }
    
    # Method 2: Check for running Node processes and their command lines
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        foreach ($proc in $nodeProcesses) {
            try {
                $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
                if ($cmdLine -and ($cmdLine -like "*expo*" -or $cmdLine -like "*metro*")) {
                    # This is our Expo process - check if it's having issues
                    if ($proc.Responding -eq $false) {
                        $logs += "WARNING: Expo Node process (PID: $($proc.Id)) is not responding"
                    }
                }
            } catch {
                # Ignore command line access errors
            }
        }
    } catch {
        # Ignore process enumeration errors
    }
    
    # Method 3: Check Windows temp directory for Metro logs
    $tempPath = $env:TEMP
    $recentTime = (Get-Date).AddMinutes(-5)
    
    try {
        # Look for Metro bundler logs in temp
        $metroLogs = Get-ChildItem -Path $tempPath -Filter "*metro*" -Recurse -ErrorAction SilentlyContinue |
                     Where-Object { $_.LastWriteTime -gt $recentTime }
        
        foreach ($log in $metroLogs) {
            try {
                if ($log.PSIsContainer) {
                    $childLogs = Get-ChildItem -Path $log.FullName -Filter "*.log" -ErrorAction SilentlyContinue
                    foreach ($childLog in $childLogs) {
                        $content = Get-Content -Path $childLog.FullName -Tail 10 -ErrorAction SilentlyContinue
                        $logs += $content | Where-Object { $_ -match "error|failed|EADDRINUSE|unable to" }
                    }
                } else {
                    $content = Get-Content -Path $log.FullName -Tail 10 -ErrorAction SilentlyContinue
                    $logs += $content | Where-Object { $_ -match "error|failed|EADDRINUSE|unable to" }
                }
            } catch {
                # Ignore file access errors
            }
        }
    } catch {
        # Ignore temp directory access errors
    }
    
    # Method 4: Check port status and add warnings
    if (Test-PortInUse -Port $Global:Config.ExpoPort) {
        # Port is in use - check if it's OUR process
        try {
            $netstatOutput = netstat -ano | Select-String ":$($Global:Config.ExpoPort) "
            $usingExpoPort = $false
              foreach ($line in $netstatOutput) {
                if ($line -match "\s(\d+)$") {
                    $processId = $matches[1]
                    if ($Global:Config.ExpoProcess -and $processId -eq $Global:Config.ExpoProcess.Id.ToString()) {
                        $usingExpoPort = $true
                        break
                    }
                }
            }
            
            if (-not $usingExpoPort) {
                $logs += "WARNING: Port $($Global:Config.ExpoPort) is in use by another process"
            }
        } catch {
            $logs += "WARNING: Could not verify port $($Global:Config.ExpoPort) status"
        }
    } else {
        # Port not in use but should be
        if ($Global:Config.ExpoProcess -and -not $Global:Config.ExpoProcess.HasExited) {
            $logs += "WARNING: Expo process running but port $($Global:Config.ExpoPort) not in use"
        }
    }
    
    if (Test-PortInUse -Port $Global:Config.MetroPort) {
        $logs += "INFO: Metro port $($Global:Config.MetroPort) is active"
    }
    
    # Method 5: Check for common error patterns in PowerShell history (last few commands)
    try {
        $history = Get-History -Count 5 -ErrorAction SilentlyContinue
        foreach ($cmd in $history) {
            if ($cmd.CommandLine -match "expo.*start" -and $cmd.ExecutionStatus -eq "Failed") {
                $logs += "HISTORY: Recent Expo start command failed"
            }
        }
    } catch {
        # Ignore history errors
    }
    
    return ($logs | Select-Object -Unique | Where-Object { $_ -and $_.Trim() -ne "" }) # Remove duplicates and empty lines
}

function Analyze-Logs {
    param([string[]]$LogLines)
    
    $errors = @()
    
    foreach ($line in $LogLines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        
        foreach ($errorType in $Global:ErrorPatterns.Keys) {
            $pattern = $Global:ErrorPatterns[$errorType].Pattern
            
            if ($line -match $pattern) {
                $error = @{
                    Type = $errorType
                    Line = $line
                    Severity = $Global:ErrorPatterns[$errorType].Severity
                    Time = Get-Date
                }
                
                Write-Log "Detected $errorType error: $line" "Error"
                $errors += $error
                
                Add-Content -Path $Global:Config.ErrorLogFile -Value "[$((Get-Date).ToString())] $errorType`: $line"
            }
        }
    }
    
    return $errors
}

function Apply-Fix {
    param($Error)
    
    Write-Log "Attempting to fix $($Error.Type) error..." "Warning"
    
    switch ($Error.Type) {
        "PORT_CONFLICT" {
            Kill-PortProcesses -Port $Global:Config.ExpoPort
            Kill-PortProcesses -Port $Global:Config.MetroPort
            Start-Sleep -Seconds 2
            Start-ExpoServer
        }
        "METRO_ERROR" {
            Write-Log "Clearing Metro bundler cache..." "Warning"
            Start-Process -FilePath "npx" -ArgumentList "expo start --host lan --clear --reset-cache --port $($Global:Config.ExpoPort)" -NoNewWindow
        }
        "REACT_NATIVE_ERROR" {
            Write-Log "React Native error detected - logging for developer attention" "Warning"
            $errorDetails = "React Native Error: $($Error.Line)"
            Add-Content -Path "react-native-errors.log" -Value "[$((Get-Date).ToString())] $errorDetails"
            Write-Log "DEVELOPER ACTION NEEDED: Check react-native-errors.log for details" "Error"
            return $false  # Don't restart for code errors, developer needs to fix
        }
        "REFERENCE_ERROR" {
            Write-Log "JavaScript error detected - logging for developer attention" "Warning"
            $errorDetails = "JavaScript Error: $($Error.Line)"
            Add-Content -Path "javascript-errors.log" -Value "[$((Get-Date).ToString())] $errorDetails"
            Write-Log "DEVELOPER ACTION NEEDED: Check javascript-errors.log for details" "Error"
            return $false  # Don't restart for code errors, developer needs to fix
        }
        "NAVIGATION_ERROR" {
            Write-Log "Navigation error detected - logging for developer attention" "Warning"
            $errorDetails = "Navigation Error: $($Error.Line)"
            Add-Content -Path "navigation-errors.log" -Value "[$((Get-Date).ToString())] $errorDetails"
            Write-Log "DEVELOPER ACTION NEEDED: Check navigation-errors.log for details" "Error"
            return $false  # Don't restart for code errors, developer needs to fix
        }
        default {
            Write-Log "No automatic fix available for $($Error.Type)" "Warning"
            return $false
        }
    }
    
    $Global:Config.FixCount++
    Write-Log "Fix applied for $($Error.Type). Total fixes: $($Global:Config.FixCount)" "Success"
    return $true
}

function Start-Monitor {
    Write-Log "=== FITTRACKER MONITOR STARTED ===" "Success"
    Write-Log "Project: $($Global:Config.ProjectPath)"
    Write-Log "Expo Port: $($Global:Config.ExpoPort)"
    
    # Initial server start
    $serverStarted = Start-ExpoServer
    if (-not $serverStarted) {
        Write-Log "Failed to start initial Expo server" "Error"
        return
    }
    
    $cycleCount = 0
      while ($Global:Config.MonitorRunning) {
        $cycleCount++
        Write-Log "=== MONITORING CYCLE #$cycleCount ==="
        
        # Check server status more thoroughly, but give it time for new processes
        $serverRunning = $false
        $processAlive = $false
        $processAge = 0
        
        try {
            if ($Global:Config.ExpoProcess -and -not $Global:Config.ExpoProcess.HasExited) {
                $processAlive = $true
                $processAge = ((Get-Date) - $Global:Config.ExpoProcess.StartTime).TotalSeconds
                
                # Give new processes at least 15 seconds to start up and bind to port
                if ($processAge -lt 15) {
                    Write-Log "Expo process is new (age: $([math]::Round($processAge, 1))s), giving it time to start..." "Info"
                    $serverRunning = $true  # Assume it's starting up
                } else {
                    # Check if the process is actually responsive after startup period
                    $portInUse = Test-PortInUse -Port $Global:Config.ExpoPort
                    $serverRunning = $portInUse
                    
                    if (-not $serverRunning) {
                        Write-Log "Expo process alive (PID: $($Global:Config.ExpoProcess.Id), age: $([math]::Round($processAge, 1))s) but port $($Global:Config.ExpoPort) not in use" "Warning"
                    } else {
                        Write-Log "Expo server running normally (PID: $($Global:Config.ExpoProcess.Id), port: $($Global:Config.ExpoPort))" "Success"
                    }
                }
            } else {
                Write-Log "No Expo process running" "Warning"
            }
        } catch {
            Write-Log "Error checking server status: $_" "Warning"
        }
        
        if (-not $serverRunning) {
            # Only restart if process is old enough or completely missing
            if (-not $processAlive -or $processAge -gt 15) {
                Write-Log "Expo server not responding, restarting..." "Warning"
                # Kill any existing processes before restart
                if ($processAlive) {
                    try {
                        Stop-Process -Id $Global:Config.ExpoProcess.Id -Force -ErrorAction SilentlyContinue
                    } catch { }
                }
                Start-ExpoServer
                continue
            }
        }
        
        # Get and analyze logs
        $logs = Get-RealtimeLogs
        if ($logs.Count -gt 0) {
            $errors = Analyze-Logs -LogLines $logs
            
            foreach ($error in $errors) {
                Apply-Fix -Error $error
            }
        }
        
        # Status report
        $uptime = (Get-Date) - $Global:Config.StartTime
        Write-Log "Status: Uptime=$($uptime.ToString('hh\:mm\:ss')) | Fixes=$($Global:Config.FixCount) | Restarts=$($Global:Config.RestartCount)"
        
        Start-Sleep -Seconds 10
    }
}

function Stop-Monitor {
    Write-Log "Stopping monitor..." "Warning"
    $Global:Config.MonitorRunning = $false
    
    if ($Global:Config.ExpoProcess -and -not $Global:Config.ExpoProcess.HasExited) {
        Write-Log "Stopping Expo server (PID: $($Global:Config.ExpoProcess.Id))"
        Stop-Process -Id $Global:Config.ExpoProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Archive logs if they exist
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $logFiles = @("expo-output.log", $Global:Config.LogFile, $Global:Config.ErrorLogFile)
    
    foreach ($logFile in $logFiles) {
        if (Test-Path $logFile) {
            $archiveName = "{0}-{1}" -f $([System.IO.Path]::GetFileNameWithoutExtension($logFile)), $timestamp
            $archiveExt = [System.IO.Path]::GetExtension($logFile)
            $archivePath = Join-Path $Global:Config.ProjectPath "logs"
            
            if (-not (Test-Path $archivePath)) {
                New-Item -ItemType Directory -Path $archivePath | Out-Null
            }
            
            Move-Item -Path $logFile -Destination (Join-Path $archivePath "$archiveName$archiveExt") -Force
        }
    }
    
    Write-Log "Monitor stopped" "Success"
}

# Handle Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action { Stop-Monitor }

# Start monitoring
try {
    Start-Monitor
} catch {
    Write-Log "Critical error: $_" "Error"
    Write-Log $_.ScriptStackTrace "Error"
} finally {
    Stop-Monitor
}
