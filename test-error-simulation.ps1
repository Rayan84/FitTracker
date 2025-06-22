# Test script to simulate common React Native errors for monitor testing
param(
    [string]$ErrorType = "web-compatibility"
)

Write-Host "=== FitTracker Error Simulation Test ===" -ForegroundColor Yellow
Write-Host "Simulating error type: $ErrorType" -ForegroundColor Cyan

switch ($ErrorType) {
    "web-compatibility" {
        Write-Host "ERROR: Unable to resolve module 'ErrorUtils' from ReactNative" -ForegroundColor Red
        Write-Host "ERROR: Module not found: AsyncStorage" -ForegroundColor Red
        Write-Host "Web Bundling failed due to missing web compatibility" -ForegroundColor Red
    }
    "port-conflict" {
        Write-Host "ERROR: EADDRINUSE: address already in use :::8081" -ForegroundColor Red
        Write-Host "ERROR: port 8081 already in use" -ForegroundColor Red
    }
    "metro-bundle" {
        Write-Host "ERROR: Metro bundle failed to build" -ForegroundColor Red
        Write-Host "ERROR: Unable to resolve module './src/components/ActivityTracker'" -ForegroundColor Red
    }
    "dependency" {
        Write-Host "ERROR: Cannot resolve dependency: react-native-maps" -ForegroundColor Red
        Write-Host "npm error: Module not found" -ForegroundColor Red
    }
    default {
        Write-Host "ERROR: Unknown error type specified" -ForegroundColor Red
    }
}

Write-Host "Check monitor log to see if auto-fixes were applied" -ForegroundColor Green
