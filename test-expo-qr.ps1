# Test script to verify Expo QR code display
Set-Location "c:\Users\LENOVO\Desktop\ios\FitTracker"
Write-Host "Testing Expo QR code display..." -ForegroundColor Green
Write-Host "Running: npx expo start --host lan --port 8081 --clear --qr" -ForegroundColor Yellow
Write-Host ""
Write-Host "This should show QR code immediately without pressing 's'" -ForegroundColor Cyan
Write-Host ""

npx expo start --host lan --port 8081 --clear --qr
