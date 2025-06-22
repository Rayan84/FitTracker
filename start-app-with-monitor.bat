@echo off
echo Starting FitTracker with Real-time Monitoring...
echo.
echo This will:
echo - Start the Expo development server
echo - Start real-time error monitoring
echo - Auto-fix issues as they occur
echo.

REM Start Expo server in background
start "Expo Server" cmd /c "npm start"

REM Wait a moment for Expo to start
timeout /t 3 /nobreak > nul

REM Start the monitor
echo Starting monitor...
powershell -ExecutionPolicy Bypass -File "%~dp0realtime-monitor.ps1" -AutoFix -Verbose

pause
