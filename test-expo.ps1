# Simple test script to start Expo
Write-Host "Testing Expo startup..."

# Check if in correct directory
Write-Host "Current directory: $(Get-Location)"

# Check if package.json exists
if (Test-Path "package.json") {
    Write-Host "✓ package.json found"
} else {
    Write-Host "✗ package.json not found"
    exit 1
}

# Check if node modules exist
if (Test-Path "node_modules") {
    Write-Host "✓ node_modules found"
} else {
    Write-Host "✗ node_modules not found - run npm install first"
    exit 1
}

# Try to start Expo
Write-Host "Starting Expo with basic settings..."
Write-Host "Command: npx expo start --host lan --port 8084 --clear"

try {
    & npx expo start --host lan --port 8084 --clear
} catch {
    Write-Host "Error starting Expo: $_"
    exit 1
}
