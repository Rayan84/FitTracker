# FitTracker Monitor - Clean Version
param(
    [int]$ExpoPort = 8081,
    [int]$MetroPort = 8080
)

$Global:Config = @{
    ExpoPort = $null
    MonitorRunning = $true
    ExpoProcess = $null
    RestartCount = 0
}

function Write-Log {
    param($Message, $Level = "Info")
    $color = if($Level -eq "Error") {"Red"} elseif($Level -eq "Warning") {"Yellow"} elseif($Level -eq "Success") {"Green"} else {"White"}
    Write-Host "$(Get-Date -Format 'HH:mm:ss') [$Level] $Message" -ForegroundColor $color
}

function Get-NetworkIP {
    try {
        $ip = (Get-NetIPConfiguration | Where-Object { $_.IPv4Address.IPAddress -match "^192\.168\." } | Select-Object -First 1).IPv4Address.IPAddress
        if ($ip) { return $ip }
        
        $ipconfig = ipconfig | Select-String "IPv4.*: (192\.168\.\d+\.\d+)"
        if ($ipconfig) { return ($ipconfig[0] -split ": ")[1].Trim() }
        
        return "localhost"
    } catch {
        return "localhost"
    }
}

function Test-PortInUse {
    param([int]$Port)
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        $listener.Stop()
        return $false
    } catch {
        return $true
    }
}

function Find-FreePort {
    param([int]$StartPort = 8081)
    for ($port = $StartPort; $port -lt ($StartPort + 20); $port++) {
        if (-not (Test-PortInUse -Port $port)) {
            return $port
        }
    }
    return $null
}

function Kill-PortProcesses {
    param([int]$Port)
    Write-Log "Cleaning up port $Port..." "Warning"
    
    $netstat = netstat -ano | Select-String ":$Port "
    foreach ($line in $netstat) {
        if ($line -match "\s+(\d+)$") {
            $pid = $matches[1]
            Write-Log "Killing process $pid on port $Port"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        $cmdLine -like "*expo*" -or $cmdLine -like "*metro*"
    } | ForEach-Object {
        Write-Log "Killing Expo/Metro process: $($_.Id)"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    Start-Sleep -Seconds 2
}

function Start-ExpoServer {
    Write-Log "Starting Expo development server..." "Info"
    
    $networkIP = Get-NetworkIP
    Write-Log "Using network IP: $networkIP for phone connectivity" "Success"
    
    if (Test-PortInUse -Port $Global:Config.ExpoPort) {
        Kill-PortProcesses -Port $Global:Config.ExpoPort
    }
    
    $expoCommand = "npx expo start --host $networkIP --port $($Global:Config.ExpoPort) --clear"
    
    try {
        Write-Log "Running: $expoCommand"
        Write-Log "Expo will be accessible at: http://${networkIP}:$($Global:Config.ExpoPort)" "Success"
        Write-Log "Scan the QR code with Expo Go app on your phone!" "Success"
        
        $processStartInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processStartInfo.FileName = "cmd.exe"
        $processStartInfo.Arguments = "/k cd /d `"$(Get-Location)`" && $expoCommand"
        $processStartInfo.UseShellExecute = $true
        $processStartInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
        
        $Global:Config.ExpoProcess = [System.Diagnostics.Process]::Start($processStartInfo)
        $Global:Config.RestartCount++
        
        Write-Log "Expo server started (PID: $($Global:Config.ExpoProcess.Id))" "Success"
        Start-Sleep -Seconds 5
        return $true
    } catch {
        Write-Log "Failed to start Expo server: $_" "Error"
        return $false
    }
}

function Start-Monitor {
    Write-Log "=== FITTRACKER MONITOR STARTED ===" "Success"
    
    # Find and save a free port
    $freePort = Find-FreePort -StartPort $ExpoPort
    if (-not $freePort) {
        Write-Log "Could not find a free port!" "Error"
        return
    }
    
    $Global:Config.ExpoPort = $freePort
    Write-Log "Using port: $freePort" "Info"
    
    # Save port for future use
    "$freePort" | Set-Content -Path "expo-port.config"
    
    # Start server
    $serverStarted = Start-ExpoServer
    if (-not $serverStarted) {
        Write-Log "Failed to start server" "Error"
        return
    }
    
    # Monitor loop
    $cycleCount = 0
    while ($Global:Config.MonitorRunning) {
        $cycleCount++
        Write-Log "=== MONITORING CYCLE #$cycleCount ==="
        
        # Check if server is still running
        if ($Global:Config.ExpoProcess.HasExited) {
            Write-Log "Expo server stopped, restarting..." "Warning"
            Start-ExpoServer
        }
        
        Start-Sleep -Seconds 10
    }
}

function Stop-Monitor {
    Write-Log "Stopping monitor..." "Warning"
    $Global:Config.MonitorRunning = $false
    
    if ($Global:Config.ExpoProcess -and -not $Global:Config.ExpoProcess.HasExited) {
        Write-Log "Stopping Expo server"
        Stop-Process -Id $Global:Config.ExpoProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

# Handle Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action { Stop-Monitor }

# Start monitoring
try {
    Start-Monitor
} catch {
    Write-Log "Critical error: $_" "Error"
} finally {
    Stop-Monitor
}
