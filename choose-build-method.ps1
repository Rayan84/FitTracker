# iOS Build Setup Helper

Write-Host "=== FitTracker iOS Build Options ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Choose your preferred build method:" -ForegroundColor Yellow
Write-Host "1. GitHub Actions (FREE - Recommended)" -ForegroundColor Green
Write-Host "2. MacStadium Cloud Mac ($2-4)" -ForegroundColor Yellow  
Write-Host "3. Set up Virtual macOS on Windows" -ForegroundColor Red
Write-Host "4. Docker Development Server (Testing only)" -ForegroundColor Blue
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`n🎉 Great choice! GitHub Actions is the best free option." -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Create a GitHub repository if you haven't already" -ForegroundColor White
        Write-Host "2. Push your code to GitHub" -ForegroundColor White
        Write-Host "3. Add your Expo token to GitHub Secrets" -ForegroundColor White
        Write-Host "4. The workflow will automatically build your iOS app" -ForegroundColor White
        Write-Host ""
        Write-Host "Do you need help setting up GitHub?" -ForegroundColor Cyan
        $github = Read-Host "Type 'yes' to get GitHub setup instructions"
        
        if ($github -eq "yes" -or $github -eq "y") {
            Write-Host ""
            Write-Host "=== GitHub Setup Instructions ===" -ForegroundColor Cyan
            Write-Host "1. Go to https://github.com and create an account" -ForegroundColor White
            Write-Host "2. Click 'New Repository'" -ForegroundColor White
            Write-Host "3. Name it 'FitTracker'" -ForegroundColor White
            Write-Host "4. Keep it public (free)" -ForegroundColor White
            Write-Host "5. Don't initialize with README (we already have files)" -ForegroundColor White
            Write-Host ""
            Write-Host "Then run these commands:" -ForegroundColor Yellow
            Write-Host "git remote add origin https://github.com/YOUR_USERNAME/FitTracker.git" -ForegroundColor Gray
            Write-Host "git branch -M main" -ForegroundColor Gray
            Write-Host "git push -u origin main" -ForegroundColor Gray
        }
    }
    
    "2" {
        Write-Host "`n💰 MacStadium is a solid choice for $2-4 total cost." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Go to https://www.macstadium.com" -ForegroundColor White
        Write-Host "2. Sign up for Mac mini M1 plan" -ForegroundColor White
        Write-Host "3. Choose hourly billing" -ForegroundColor White
        Write-Host "4. Follow the MACSTADIUM_BUILD_GUIDE.md in your project" -ForegroundColor White
        Write-Host ""
        Write-Host "The guide is already created in your project folder!" -ForegroundColor Green
    }
    
    "3" {
        Write-Host "`n⚠️  Virtual macOS setup is complex and legally gray." -ForegroundColor Red
        Write-Host ""
        Write-Host "Requirements:" -ForegroundColor Yellow
        Write-Host "• 16GB+ RAM" -ForegroundColor White
        Write-Host "• 100GB+ free disk space" -ForegroundColor White
        Write-Host "• Intel processor with virtualization" -ForegroundColor White
        Write-Host "• VMware Workstation Pro ($250) or VirtualBox (free)" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  Note: This violates Apple's license agreement" -ForegroundColor Red
        Write-Host "💡 Recommendation: Use GitHub Actions instead (it's free and legal)" -ForegroundColor Green
    }
    
    "4" {
        Write-Host "`n🐳 Docker is great for development but can't build iOS apps." -ForegroundColor Blue
        Write-Host ""
        Write-Host "Starting Docker development server..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Run: docker-compose up" -ForegroundColor Gray
        Write-Host "Then open: http://localhost:19002" -ForegroundColor Gray
        Write-Host ""
        Write-Host "⚠️  This only works with Expo Go, not native features" -ForegroundColor Yellow
    }
    
    default {
        Write-Host "`n❌ Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📖 For detailed instructions, check these files:" -ForegroundColor Cyan
Write-Host "• VIRTUAL_BUILD_OPTIONS.md" -ForegroundColor Gray
Write-Host "• MACSTADIUM_BUILD_GUIDE.md" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
