# Create project archive for MacStadium upload

Write-Host "Creating project archive for MacStadium upload..." -ForegroundColor Green

$projectPath = "c:\Users\LENOVO\Desktop\ios\FitTracker"
$archiveName = "FitTracker-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$archivePath = Join-Path $desktopPath $archiveName

Write-Host "Compressing project files..." -ForegroundColor Yellow

try {
    # Create a temporary directory for files to compress
    $tempDir = Join-Path $env:TEMP "FitTracker-temp"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    # Copy essential files
    $filesToCopy = @(
        "src",
        "assets", 
        "components",
        "app",
        "constants",
        "hooks",
        "scripts",
        "package.json",
        "app.json",
        "eas.json",
        "babel.config.js",
        "metro.config.js",
        "tsconfig.json",
        "index.js",
        "App.js"
    )
    
    foreach ($item in $filesToCopy) {
        $sourcePath = Join-Path $projectPath $item
        if (Test-Path $sourcePath) {
            $destPath = Join-Path $tempDir $item
            if (Test-Path $sourcePath -PathType Container) {
                Copy-Item $sourcePath $destPath -Recurse -Force
            } else {
                Copy-Item $sourcePath $destPath -Force
            }
            Write-Host "Copied: $item" -ForegroundColor Gray
        }
    }
    
    # Create archive from temp directory
    Compress-Archive -Path "$tempDir\*" -DestinationPath $archivePath -Force
    
    # Clean up temp directory
    Remove-Item $tempDir -Recurse -Force
    
    Write-Host "Archive created successfully!" -ForegroundColor Green
    Write-Host "Location: $archivePath" -ForegroundColor Cyan
    Write-Host "Size: $([math]::Round((Get-Item $archivePath).Length / 1MB, 2)) MB" -ForegroundColor Cyan
    
    # Open folder
    Start-Process "explorer.exe" -ArgumentList "/select,`"$archivePath`""
    
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Sign up for MacStadium at macstadium.com" -ForegroundColor White
    Write-Host "2. Launch a Mac mini M1 instance" -ForegroundColor White
    Write-Host "3. Upload this ZIP file to your Mac instance" -ForegroundColor White
    Write-Host "4. Follow the MACSTADIUM_BUILD_GUIDE.md instructions" -ForegroundColor White
    
} catch {
    Write-Host "Error creating archive: $_" -ForegroundColor Red
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
