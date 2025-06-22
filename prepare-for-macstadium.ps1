# Quick Project Upload Script for MacStadium

# This script helps you prepare and upload your FitTracker project to MacStadium

# Step 1: Create a project archive (run this on your Windows machine)
Write-Host "Creating project archive for MacStadium upload..." -ForegroundColor Green

# Set project path
$projectPath = "c:\Users\LENOVO\Desktop\ios\FitTracker"
$archiveName = "FitTracker-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$archivePath = Join-Path $desktopPath $archiveName

# Create zip file excluding node_modules and other unnecessary files
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Files/folders to exclude
$excludePatterns = @(
    "node_modules",
    ".expo",
    ".git",
    "logs",
    "*.log",
    ".DS_Store",
    "Thumbs.db",
    "dist",
    "build",
    ".vscode",
    "*.tmp"
)

Write-Host "Compressing project files..." -ForegroundColor Yellow
Write-Host "Excluding: $($excludePatterns -join ', ')" -ForegroundColor Gray

try {
    # Use PowerShell's Compress-Archive cmdlet
    $filesToCompress = Get-ChildItem -Path $projectPath -Recurse | Where-Object {
        $file = $_
        $shouldExclude = $false
        
        foreach ($pattern in $excludePatterns) {
            if ($file.Name -like $pattern -or $file.FullName -like "*\$pattern\*") {
                $shouldExclude = $true
                break
            }
        }
        
        return -not $shouldExclude
    }
    
    # Create archive
    $filesToCompress | Compress-Archive -DestinationPath $archivePath -Force
    
    Write-Host "✅ Archive created successfully!" -ForegroundColor Green
    Write-Host "📁 Location: $archivePath" -ForegroundColor Cyan
    Write-Host "📊 Size: $([math]::Round((Get-Item $archivePath).Length / 1MB, 2)) MB" -ForegroundColor Cyan
    
    Write-Host "`n🚀 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Upload this ZIP file to your MacStadium instance" -ForegroundColor White
    Write-Host "2. Extract it using: unzip $archiveName" -ForegroundColor White
    Write-Host "3. Follow the MACSTADIUM_BUILD_GUIDE.md instructions" -ForegroundColor White
    
    # Open the folder containing the archive
    Start-Process "explorer.exe" -ArgumentList "/select,`"$archivePath`""
    
} catch {
    Write-Host "❌ Error creating archive: $_" -ForegroundColor Red
    Write-Host "💡 Try creating the archive manually using Windows built-in compression" -ForegroundColor Yellow
}

Write-Host "`n📋 Upload Methods to MacStadium:" -ForegroundColor Cyan
Write-Host "• Use SCP: scp `$archiveName username@your-macstadium-ip:~/" -ForegroundColor Gray
Write-Host "• Use Remote Desktop file sharing" -ForegroundColor Gray
Write-Host "• Upload to cloud storage (Google Drive, Dropbox) and download on Mac" -ForegroundColor Gray

Read-Host "Press Enter to exit"
