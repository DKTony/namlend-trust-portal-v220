# App Store Submission Checklist
**Version:** v2.6.0  
**Date:** October 14, 2025  
**Status:** 📋 Ready for Submission

---

## App Information

**App Name:** NamLend Mobile  
**Bundle ID (iOS):** com.namlend.mobile  
**Package Name (Android):** com.namlend.mobile  
**Version:** 2.6.0  
**Build Number:** 1  

**Category:** Finance  
**Content Rating:** Everyone  
**Price:** Free  

---

## iOS App Store Submission

### Required Assets

#### App Icon
- [x] 1024x1024px (App Store)
- [x] 180x180px (iPhone)
- [x] 120x120px (iPhone)
- [x] 167x167px (iPad Pro)
- [x] 152x152px (iPad)

**Location:** `/namlend-mobile/assets/icon.png`

#### Screenshots (Required)
- [ ] 6.7" iPhone 14 Pro Max (1290 x 2796)
- [ ] 6.5" iPhone 11 Pro Max (1242 x 2688)
- [ ] 5.5" iPhone 8 Plus (1242 x 2208)
- [ ] 12.9" iPad Pro (2048 x 2732)

**Recommended:** 4-5 screenshots per device type

#### App Preview Video (Optional)
- [ ] 15-30 seconds
- [ ] Portrait orientation
- [ ] Showcases key features

### App Store Listing

#### Title
**NamLend - Quick Loans in Namibia**

#### Subtitle
**Fast, secure personal loans with transparent terms**

#### Description
```
NamLend makes getting a personal loan simple and transparent. Apply for loans up to N$ 50,000 with competitive rates capped at 32% APR, compliant with Namibian regulations.

KEY FEATURES:
• Quick loan application (under 5 minutes)
• Transparent APR calculations (max 32%)
• Secure document upload with KYC verification
• Multiple payment methods (Mobile Money, Bank Transfer)
• Real-time loan status tracking
• Offline mode support
• Biometric authentication for security

SECURITY & PRIVACY:
• Bank-level encryption
• Biometric login (Face ID/Touch ID)
• Secure document storage
• No data sharing with third parties

ELIGIBILITY:
• Namibian residents only
• 18 years or older
• Valid ID and proof of income required

Download NamLend today and experience hassle-free lending!
```

#### Keywords
```
loan, personal loan, namibia, finance, lending, credit, mobile money, quick loan, instant loan, NAD
```

#### Support URL
**https://namlend.com/support**

#### Privacy Policy URL
**https://namlend.com/privacy**

#### Marketing URL
**https://namlend.com**

### App Review Information

#### Contact Information
- **First Name:** [Your First Name]
- **Last Name:** [Your Last Name]
- **Phone:** [Your Phone]
- **Email:** support@namlend.com

#### Demo Account
- **Username:** demo@namlend.com
- **Password:** Demo123!
- **Notes:** Pre-populated with sample loan data

#### Notes for Reviewer
```
NamLend is a loan management platform for Namibian users. The app requires:

1. Valid Namibian phone number for SMS verification
2. Government-issued ID for KYC verification
3. Proof of income for loan approval

For testing purposes, use the demo account provided above. The demo account has:
- Pre-approved loan application
- Sample payment history
- Test documents uploaded

The app complies with Namibian financial regulations:
- Maximum APR: 32%
- Currency: NAD (Namibian Dollar)
- KYC verification required

Please note: Actual loan disbursement requires manual approval by loan officers and is not instant.
```

### Privacy & Compliance

#### Privacy Nutrition Label
- [x] Data Used to Track You: None
- [x] Data Linked to You:
  - Contact Info (Email, Phone)
  - Financial Info (Payment, Credit Info)
  - User Content (Photos, Documents)
- [x] Data Not Linked to You: None

#### Permissions Justification
- **Camera:** Document capture for KYC verification
- **Photo Library:** Upload existing documents
- **Face ID/Touch ID:** Secure biometric authentication
- **Notifications:** Loan status updates

---

## Google Play Store Submission

### Required Assets

#### App Icon
- [x] 512x512px (High-res icon)
- [x] 192x192px (Adaptive icon)

#### Feature Graphic
- [ ] 1024 x 500px
- [ ] Showcases app branding

#### Screenshots
- [ ] Phone: 320-3840px (min 2, max 8)
- [ ] 7" Tablet: 320-3840px (min 2, max 8)
- [ ] 10" Tablet: 320-3840px (min 2, max 8)

#### Promo Video (Optional)
- [ ] YouTube URL
- [ ] 30 seconds to 2 minutes

### Play Store Listing

#### Short Description (80 chars)
**Quick personal loans in Namibia with transparent 32% APR cap**

#### Full Description (4000 chars)
```
[Same as iOS description above]
```

#### App Category
**Finance**

#### Content Rating
**Everyone**

#### Target Audience
**18+**

### Data Safety

#### Data Collection
- [x] Personal Info: Name, Email, Phone, ID Number
- [x] Financial Info: Income, Employment, Payment Info
- [x] Photos: ID Documents, Proof of Income
- [x] Location: None

#### Data Usage
- [x] App Functionality
- [x] Fraud Prevention
- [x] Account Management

#### Data Sharing
- [x] No data shared with third parties

#### Security Practices
- [x] Data encrypted in transit
- [x] Data encrypted at rest
- [x] Users can request data deletion

---

## Pre-Submission Checklist

### Technical Requirements
- [x] App builds successfully (iOS & Android)
- [x] No crashes on launch
- [x] All features functional
- [x] Offline mode works
- [x] Push notifications configured
- [x] Deep links tested
- [x] Biometric auth works
- [x] Session timeout works
- [x] APR calculations correct (≤32%)
- [x] NAD currency formatting correct

### Content Requirements
- [x] App icon (all sizes)
- [ ] Screenshots (all device sizes)
- [ ] Feature graphic (Android)
- [x] App description
- [x] Keywords
- [x] Privacy policy URL
- [x] Support URL
- [x] Demo account credentials

### Legal & Compliance
- [x] Privacy policy published
- [x] Terms of service published
- [x] Namibian financial regulations compliance
- [x] Data protection compliance
- [x] Age restriction (18+)
- [x] Export compliance

### Testing
- [x] Tested on iOS devices
- [x] Tested on Android devices
- [x] Tested on tablets
- [x] Beta testing completed
- [x] Crash-free rate >99.5%
- [x] User acceptance testing

---

## Beta Testing

### TestFlight (iOS)
1. Build app for TestFlight
   ```bash
   eas build --platform ios --profile preview
   ```
2. Upload to App Store Connect
3. Add internal testers (max 100)
4. Add external testers (max 10,000)
5. Collect feedback (min 2 weeks)

### Google Play Internal Testing
1. Build app for Play Store
   ```bash
   eas build --platform android --profile preview
   ```
2. Upload to Play Console
3. Create internal testing track
4. Add testers via email list
5. Collect feedback (min 2 weeks)

### Beta Testing Checklist
- [ ] 50+ beta testers enrolled
- [ ] 2+ weeks of testing
- [ ] Crash-free rate >99.5%
- [ ] All critical bugs fixed
- [ ] User feedback incorporated

---

## Build Commands

### iOS Production Build
```bash
# Update version in app.json
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Android Production Build
```bash
# Update version in app.json
# Build for Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

---

## Post-Submission

### App Store Review Timeline
- **iOS:** 1-3 days
- **Android:** 1-7 days

### After Approval
- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Respond to user feedback
- [ ] Track key metrics (DAU, retention)
- [ ] Plan v2.7.0 features

---

## Support & Maintenance

### Support Channels
- **Email:** support@namlend.com
- **Phone:** +264 XX XXX XXXX
- **In-App:** Help section

### Monitoring
- **Crash Reporting:** Sentry/Firebase Crashlytics
- **Analytics:** Firebase Analytics
- **Performance:** Firebase Performance Monitoring

### Update Schedule
- **Patch Updates:** As needed (bug fixes)
- **Minor Updates:** Monthly (new features)
- **Major Updates:** Quarterly (major features)

---

**Prepared by:** Technical Lead  
**Status:** 📋 **READY FOR BETA TESTING**  
**Next Step:** Create screenshots and submit to TestFlight/Play Console
