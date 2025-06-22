# MacStadium iOS Build Guide for FitTracker

## Overview
This guide will help you build a native iOS IPA file for FitTracker using MacStadium's cloud Mac service, which you can then sideload using AltStore.

## Step 1: MacStadium Setup (5-10 minutes)

### Account Creation
1. Visit [MacStadium.com](https://www.macstadium.com)
2. Click "Get Started" and create an account
3. Choose **Mac mini M1** plan (recommended for cost-effectiveness)
4. Select **Hourly billing** (approximately $0.50-1.00/hour)
5. Complete payment setup

### Instance Launch
1. Once logged in, go to your dashboard
2. Click "Launch Instance" 
3. Choose macOS version (latest stable recommended)
4. Wait for instance to boot (2-3 minutes)
5. Note the connection details (IP address, username, password)

## Step 2: Connect to Your Mac Instance

### Option A: Screen Sharing (Recommended)
1. Open Remote Desktop Connection on Windows
2. Enter the IP address provided by MacStadium
3. Use the credentials provided
4. You should see the macOS desktop

### Option B: SSH (Command Line)
```bash
ssh username@your-macstadium-ip
```

## Step 3: Prepare the macOS Environment

### Install Required Tools
Open Terminal on the Mac instance and run:

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and npm
brew install node

# Install Git
brew install git

# Install Xcode Command Line Tools
xcode-select --install

# Install EAS CLI
npm install -g @expo/cli
npm install -g eas-cli
```

### Clone Your Project
```bash
# Clone your project (you'll need to upload it first)
git clone https://github.com/yourusername/FitTracker.git
# OR upload your project files via file transfer

cd FitTracker
npm install
```

## Step 4: Upload Your Project to MacStadium

### Option A: Using Git (Recommended)
1. Push your current project to GitHub/GitLab
2. Clone it on the Mac instance using the commands above

### Option B: File Transfer
1. Use SCP or SFTP to transfer files
2. Or use the file sharing feature in Remote Desktop

## Step 5: Build the IPA

### Login to Expo
```bash
npx expo login
# Use your Expo account credentials
```

### Build the IPA
```bash
# Build using the sideload profile
npx eas build --platform ios --profile sideload

# OR build a development client
npx eas build --platform ios --profile development
```

The build process will:
1. Ask for Apple ID credentials (use your free Apple ID)
2. Generate certificates automatically
3. Build the IPA file
4. Provide a download link

## Step 6: Download the IPA

1. The build will complete in 10-15 minutes
2. You'll get a download link in the terminal
3. Download the IPA file to your Mac instance
4. Transfer it back to your Windows machine

### Transfer Methods:
- **Email**: Email the IPA to yourself
- **Cloud Storage**: Upload to Google Drive/Dropbox
- **Direct Download**: Use the EAS build download link

## Step 7: Install with AltStore

### On Your Windows Machine:
1. Ensure AltStore is installed and running
2. Make sure AltServer is running in system tray
3. Connect your iPhone via USB
4. Trust the computer on your iPhone

### Install the IPA:
1. Open AltStore on your iPhone
2. Go to "My Apps" tab
3. Tap the "+" button
4. Select the IPA file you downloaded
5. Enter your Apple ID when prompted
6. Wait for installation to complete

## Step 8: Trust the Developer

1. On your iPhone, go to Settings > General > VPN & Device Management
2. Find your Apple ID under "Developer App"
3. Tap it and select "Trust"
4. Confirm by tapping "Trust" again

## Step 9: Launch Your App

Your FitTracker app should now be installed natively on your iPhone with all features working, including:
- HealthKit integration
- GPS tracking
- Map rotation
- Background location
- All native iOS features

## Cost Breakdown

- MacStadium Mac mini M1: ~$0.50-1.00/hour
- Total time needed: 1-2 hours
- **Total cost: $1-2** for the entire process

## Troubleshooting

### Common Issues:
1. **Certificate Issues**: Use a fresh Apple ID if you encounter certificate problems
2. **Build Failures**: Check the build logs in EAS dashboard
3. **Upload Issues**: Ensure your internet connection is stable
4. **AltStore Issues**: Make sure AltServer is running and iPhone is trusted

### Support Resources:
- EAS Build docs: https://docs.expo.dev/build/setup/
- AltStore help: https://altstore.io/faq/
- MacStadium support: Available through their dashboard

## Next Steps

Once installed, your app will work for 7 days. To refresh:
1. Open AltStore on your iPhone
2. Tap "Refresh All" (requires AltServer running on your computer)
3. Or rebuild and reinstall using the same process

This gives you a fully native iOS app with all features working, without needing a paid Apple Developer account!
