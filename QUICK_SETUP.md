# Quick Reference: GitHub Actions Setup

## 🔑 Your Expo Token
```
JVGIXGos6CL4FeDo3B-yyDvCEkZcnGuzmo2yFYZC
```

## 📝 Commands to Run (replace YOUR_USERNAME)
```bash
git remote add origin https://github.com/YOUR_USERNAME/FitTracker.git
git branch -M main
git push -u origin main
```

## 🔐 Add to GitHub Secrets
1. Go to your repository → Settings → Secrets and Variables → Actions
2. Click "New repository secret"
3. Name: `EXPO_TOKEN`
4. Value: `JVGIXGos6CL4FeDo3B-yyDvCEkZcnGuzmo2yFYZC`
5. Click "Add secret"

## 🚀 Trigger Build
1. Go to Actions tab in your repository
2. Click "Build iOS App" workflow
3. Click "Run workflow"
4. Wait 10-15 minutes
5. Download IPA from Artifacts

## 📱 Install with AltStore
1. Download IPA from GitHub Actions
2. Open AltStore on iPhone → My Apps → "+"
3. Select the IPA file
4. Enter Apple ID when prompted
5. Trust developer certificate in iPhone Settings

## ✅ Result
Your FitTracker app will be natively installed with all features:
- HealthKit integration
- GPS tracking
- Map rotation
- Background location
