# GitHub Actions iOS Build Setup Guide

## 🎯 Quick Setup Checklist

### ✅ Completed
- [x] Project files committed to git
- [x] GitHub Actions workflow created
- [x] Expo account logged in (rayan84)

### 🔄 Next Steps

### **Step 1: Create GitHub Repository**
1. Go to [github.com](https://github.com) and sign in
2. Click **"New"** button (green, top left)
3. Repository name: `FitTracker`
4. Description: `React Native fitness tracking app with GPS and HealthKit`
5. Set to **Public** (required for free GitHub Actions)
6. **DO NOT** check any initialization options
7. Click **"Create repository"**

### **Step 2: Connect Local to GitHub**
After creating the repository, run these commands in your terminal:

```bash
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/FitTracker.git
git branch -M main
git push -u origin main
```

### **Step 3: Create Expo Access Token**
1. Go to: https://expo.dev/accounts/rayan84/settings/access-tokens
2. Click **"Create Token"**
3. Name: `GitHub Actions`
4. **Copy the token** (save it somewhere safe)

### **Step 4: Add Token to GitHub Secrets**
1. Go to your GitHub repository
2. Click **Settings** tab
3. Go to **Secrets and Variables** → **Actions**
4. Click **"New repository secret"**
5. Name: `EXPO_TOKEN`
6. Value: [paste your token from step 3]
7. Click **"Add secret"**

### **Step 5: Trigger Your First Build**
1. Go to your repository's **Actions** tab
2. You should see the **"Build iOS App"** workflow
3. Click **"Run workflow"** to start a manual build
4. Wait 10-15 minutes for the build to complete
5. Download the IPA from the **Artifacts** section

### **Step 6: Install on iPhone with AltStore**
1. Download the IPA file from GitHub Actions
2. Open AltStore on your iPhone
3. Go to **"My Apps"** tab
4. Tap **"+"** button
5. Select the IPA file
6. Enter your Apple ID when prompted
7. Wait for installation

### **Step 7: Trust Developer Certificate**
1. iPhone Settings → General → VPN & Device Management
2. Find your Apple ID under **"Developer App"**
3. Tap it and select **"Trust"**
4. Confirm by tapping **"Trust"** again

## 🎉 Result
Your FitTracker app will be natively installed on your iPhone with:
- ✅ Full HealthKit integration
- ✅ GPS background tracking
- ✅ Map rotation features
- ✅ All native iOS capabilities

## 🔄 Future Updates
Every time you push code to GitHub, a new build will automatically start!

## 💰 Cost
- **GitHub**: Free (public repositories)
- **GitHub Actions**: Free (2000 minutes/month)
- **Expo**: Free account
- **Total Cost**: $0.00

## 🆘 Troubleshooting
- **Build fails**: Check the Actions logs for detailed error messages
- **Token issues**: Make sure EXPO_TOKEN is correctly set in repository secrets
- **AltStore issues**: Ensure AltServer is running on your computer
- **App won't install**: Check that you've trusted the developer certificate

## 📱 App Refresh
AltStore apps expire after 7 days. To refresh:
1. Open AltStore on iPhone
2. Tap **"Refresh All"** (requires AltServer running)
3. Or simply rebuild and reinstall from GitHub Actions
