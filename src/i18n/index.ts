/**
 * i18n Configuration
 * Provides internationalization support using react-i18next.
 * Currently supports English with language detection for future expansion.
 */

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import authEN from './locales/en/auth.json';
import budgetEN from './locales/en/budget.json';
import commonEN from './locales/en/common.json';
import dashboardEN from './locales/en/dashboard.json';
import kycEN from './locales/en/kyc.json';
import landingEN from './locales/en/landing.json';
import loanApplicationEN from './locales/en/loanApplication.json';
import paymentEN from './locales/en/payment.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEN,
        auth: authEN,
        landing: landingEN,
        kyc: kycEN,
        dashboard: dashboardEN,
        payment: paymentEN,
        budget: budgetEN,
        loanApplication: loanApplicationEN,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'landing', 'kyc', 'dashboard', 'payment', 'budget', 'loanApplication'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'namlend-language',
    },
  });

export default i18n;
