# NamLend Mobile - Quick Start Guide

## ✅ Setup Complete!

Your mobile app is now configured and ready to test.

## 🔐 Test Credentials

Use these credentials to sign in to the mobile app:

### Admin/Loan Officer Account
- **Email**: `anthnydklrk@gmail.com`
- **Password**: `123abc`
- **Role**: Admin (can access approver features)

### Client Account (if needed)
- Create a new account through the web app first
- Or use any existing client account from your database

## 📱 How to Test the App

### Option 1: Expo Go (Recommended - Easiest)

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR Code**:
   - The QR code is displayed in your terminal
   - iOS: Use Camera app to scan
   - Android: Use Expo Go app to scan

3. **App will load automatically** on your device

### Option 2: Web Browser (Quick UI Testing)

1. Press `w` in the terminal
2. Browser will open at `http://localhost:8081`
3. Note: Biometric features won't work in browser

### Option 3: iOS Simulator (Requires Xcode)

1. Install Xcode from App Store (if not already installed)
2. Run: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
3. Press `i` in the terminal to launch iOS simulator

### Option 4: Android Emulator (Requires Android Studio)

1. Install Android Studio
2. Set up an Android Virtual Device (AVD)
3. Press `a` in the terminal to launch emulator

## 🎯 What to Test

### 1. Login Flow
- Open the app
- Enter email: `anthnydklrk@gmail.com`
- Enter password: `123abc`
- Click "Sign In"

### 2. Approver Features (Admin/Loan Officer)
After signing in, you'll see:
- **Dashboard Tab**: Approval statistics and pending actions
- **Approvals Tab**: Queue of loan applications to review
- **Profile Tab**: Account settings

### 3. Test Approval Workflow
1. Go to Approvals tab
2. Filter by status (Pending/Under Review)
3. Tap on an application
4. Review loan details and applicant info
5. Add notes (optional)
6. Tap "Approve" or "Reject"

### 4. Client Features (Create Client Account First)
- Dashboard with loan statistics
- Loans list with filtering
- Loan details and repayment schedule
- Payment processing
- Document upload
- Profile management

## 🔄 Development Commands

In the terminal, you can press:
- `r` - Reload the app
- `m` - Toggle developer menu
- `j` - Open debugger
- `w` - Open in web browser
- `Ctrl+C` - Stop the server

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
- Check your internet connection
- Verify `.env` file has correct credentials
- Restart the Expo server

### "Biometric authentication not working"
- Biometric only works on physical devices
- Ensure your device has Face ID/Touch ID/Fingerprint set up
- Grant app permissions when prompted

### App not loading on Expo Go
- Make sure your phone and computer are on the same WiFi network
- Try scanning the QR code again
- Restart Expo Go app

### Xcode errors
- Ensure Xcode is fully installed
- Run: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
- Accept Xcode license if prompted

## 📊 Current Database Status

Your Supabase database already has:
- ✅ User accounts (including admin account)
- ✅ Loan applications for testing
- ✅ Approval requests in queue
- ✅ All necessary tables and RLS policies

## 🚀 Next Steps

1. **Test on your phone** using Expo Go (easiest)
2. **Sign in** with the admin credentials above
3. **Explore** the approver dashboard and approval queue
4. **Review** and approve/reject test applications
5. **Test** the complete workflow

## 📝 Notes

- The app connects to the same Supabase database as your web app
- All data is real and synced between web and mobile
- Changes made in mobile app will reflect in web app and vice versa
- Biometric authentication is available but optional

## 🎉 You're Ready!

The app is now running and ready to test. Scan the QR code in your terminal with Expo Go to get started!
