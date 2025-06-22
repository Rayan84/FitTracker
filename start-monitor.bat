@echo off
echo Starting FitTracker Real-time Monitor...
echo.
echo This will:
echo - Monitor your app for errors in real-time
echo - Automatically fix common issues
echo - Log all activities to monitor.log
echo.
echo Press Ctrl+C to stop monitoring
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0realtime-monitor.ps1" -AutoFix -Verbose
pause
