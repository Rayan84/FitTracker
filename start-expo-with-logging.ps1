Set-Location 'C:\Users\LENOVO\Desktop\ios\FitTracker'
Write-Host '[MONITOR] Starting Expo server with QR code display...'
Write-Host ''
Write-Host 'IMPORTANT: QR code will appear immediately - scan with Expo Go app!'
Write-Host 'No need to press any keys - QR display is automatic!'
Write-Host ''
Write-Host 'Starting Expo server...'

# Start Expo and capture both output and display in terminal
& cmd /c "npx expo start --host lan --port 8084 --clear 2>&1" | Tee-Object -FilePath "C:\Users\LENOVO\Desktop\ios\FitTracker\expo-output.log"
