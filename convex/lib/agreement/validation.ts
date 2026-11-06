/**
 * Borrower-detail corrections made while preparing an agreement.
 *
 * Corrections are written to the borrower's PROFILE — the source record — never to the
 * agreement, so there is one copy of each fact. These rules are shared by the Convex
 * mutation and the staff form (via src/), so both reject the same inputs.
 */

/** Profile columns staff may correct from the agreement workspace. */
export const CORRECTABLE_PROFILE_FIELDS = [
  'surname',
  'firstNames',
  'idNumber',
  'phone',
  'addressLine1',
  'addressLine2',
  'city',
  'postalCode',
  'country',
  'employerName',
  'employeeNumber',
  'workAddress',
  'bankName',
  'accountHolderName',
  'accountNumber',
  'accountType',
  'branchName',
  'branchCode',
] as const;

export type CorrectableProfileField = (typeof CORRECTABLE_PROFILE_FIELDS)[number];

/** Agreement field key → the profile columns that feed it. */
export const AGREEMENT_FIELD_SOURCES: Record<string, readonly CorrectableProfileField[]> = {
  surname: ['surname'],
  firstNames: ['firstNames'],
  fullName: ['firstNames', 'surname'],
  idNumber: ['idNumber'],
  mobile: ['phone'],
  residentialAddress: ['addressLine1', 'addressLine2', 'city', 'postalCode', 'country'],
  employerName: ['employerName'],
  employeeNumber: ['employeeNumber'],
  workAddress: ['workAddress'],
  bankName: ['bankName'],
  accountHolderName: ['accountHolderName'],
  accountNumber: ['accountNumber'],
  accountType: ['accountType'],
  branchName: ['branchName'],
  branchCode: ['branchCode'],
};

export const ACCOUNT_TYPES = ['Cheque', 'Savings', 'Transmission', 'Current'] as const;

export const PROFILE_FIELD_LABELS: Record<CorrectableProfileField, string> = {
  surname: 'Surname',
  firstNames: 'Full first names',
  idNumber: 'ID / Passport no.',
  phone: 'Mobile no.',
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2',
  city: 'Town / City',
  postalCode: 'Postal code',
  country: 'Country',
  employerName: 'Employer',
  employeeNumber: 'Employer no.',
  workAddress: 'Work address',
  bankName: 'Bank name',
  accountHolderName: 'Account holder',
  accountNumber: 'Account number',
  accountType: 'Account type',
  branchName: 'Branch name',
  branchCode: 'Branch code',
};

const NAME = /^[\p{L}][\p{L}' .-]{0,79}$/u;
const NAMIBIAN_ID = /^\d{11}$/;
const PASSPORT = /^[A-Z0-9]{6,12}$/i;

/** Returns an error message, or null when the value is acceptable. */
export function validateProfileValue(field: CorrectableProfileField, raw: string): string | null {
  const value = raw.trim();
  const optional: CorrectableProfileField[] = [
    'addressLine2',
    'employeeNumber',
    'branchName',
    'postalCode',
  ];
  if (!value)
    return optional.includes(field) ? null : `${PROFILE_FIELD_LABELS[field]} is required.`;

  switch (field) {
    case 'surname':
    case 'firstNames':
    case 'accountHolderName':
      return NAME.test(value) ? null : 'Use letters, spaces, hyphens or apostrophes only.';
    case 'idNumber':
      return NAMIBIAN_ID.test(value) || PASSPORT.test(value)
        ? null
        : 'Enter an 11-digit Namibian ID number or a 6–12 character passport number.';
    case 'phone': {
      const digits = value.replace(/[\s()-]/g, '');
      return /^\+?\d{9,15}$/.test(digits)
        ? null
        : 'Enter a phone number of 9–15 digits, e.g. +264 81 123 4567.';
    }
    case 'accountNumber':
      return /^\d{5,20}$/.test(value.replace(/[\s-]/g, ''))
        ? null
        : 'Account numbers are 5–20 digits.';
    case 'branchCode':
      return /^\d{4,8}$/.test(value) ? null : 'Branch codes are 4–8 digits.';
    case 'accountType':
      return (ACCOUNT_TYPES as readonly string[]).includes(value)
        ? null
        : `Choose one of: ${ACCOUNT_TYPES.join(', ')}.`;
    case 'postalCode':
      return /^[A-Za-z0-9 ]{3,10}$/.test(value) ? null : 'Postal codes are 3–10 letters or digits.';
    default:
      return value.length <= 200 ? null : 'Keep this under 200 characters.';
  }
}

/** Normalised for comparing a typed acceptance name against the borrower's name. */
export function normaliseName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Last four letters/digits of an ID or passport number. */
export function idLast4(idNumber: string): string {
  return idNumber
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-4)
    .toUpperCase();
}
