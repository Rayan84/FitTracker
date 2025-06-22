# FitTracker Monitor Commands
# Collection of useful monitoring commands

# Quick start commands
function Start-FitTrackerMonitor {
    Write-Host "Starting FitTracker Monitor..." -ForegroundColor Green
    & ".\realtime-monitor.ps1" -AutoFix -Verbose
}

function Start-FitTrackerWithMonitor {
    Write-Host "Starting FitTracker with Monitor..." -ForegroundColor Green
    Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Minimized
    Start-Sleep -Seconds 5
    & ".\realtime-monitor.ps1" -AutoFix -Verbose
}

function Stop-FitTrackerMonitor {
    Write-Host "Stopping all monitoring processes..." -ForegroundColor Red
    Get-Process | Where-Object { $_.ProcessName -like "*expo*" -or $_.ProcessName -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "Monitor stopped." -ForegroundColor Green
}

function Show-MonitorLogs {
    if (Test-Path "monitor.log") {
        Get-Content "monitor.log" -Tail 20
    } else {
        Write-Host "No monitor logs found." -ForegroundColor Yellow
    }
}

function Clear-MonitorLogs {
    if (Test-Path "monitor.log") {
        Remove-Item "monitor.log" -Force
        Write-Host "Monitor logs cleared." -ForegroundColor Green
    }
}

# Export functions
Export-ModuleMember -Function Start-FitTrackerMonitor, Start-FitTrackerWithMonitor, Stop-FitTrackerMonitor, Show-MonitorLogs, Clear-MonitorLogs

# Display help
Write-Host "=== FitTracker Monitor Commands ===" -ForegroundColor Cyan
Write-Host "Available commands:" -ForegroundColor White
Write-Host "  Start-FitTrackerMonitor      - Start monitoring only" -ForegroundColor Green
Write-Host "  Start-FitTrackerWithMonitor  - Start app + monitoring" -ForegroundColor Green
Write-Host "  Stop-FitTrackerMonitor       - Stop all monitoring" -ForegroundColor Red
Write-Host "  Show-MonitorLogs            - Show recent logs" -ForegroundColor Yellow
Write-Host "  Clear-MonitorLogs           - Clear log files" -ForegroundColor Yellow
Write-Host ""
