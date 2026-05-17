/**
 * Real-world-shaped scam message fixtures for use in unit tests.
 * Drawn from public examples; no real PII or live URLs.
 *
 * Organized by expected risk level, not by scam type.
 */

export const SAFE_MESSAGES = [
  'Hey, are we still on for dinner at 7?',
  'Your Uber is arriving in 3 minutes. Driver: Sarah in a blue Toyota.',
  'Reminder: dentist appointment tomorrow at 10am. Reply C to confirm.',
  'Thanks for your order! Tracking: https://www.amazon.com/orders',
  'Mom called. Call her back when you can.',
  'G-482917 is your Google verification code.',
  'Your Chase security code is 839204. Do not share this code with anyone.',
  'Your Google verification code is 482917. Do not share your code with anyone.',
] as const;

export const SUSPICIOUS_MESSAGES = [
  'Your package is delayed. Track here: https://courier-update.info/track',
  'Verify your account to continue using our services: www.account-verify-now.com',
  'Limited time offer! 50% off premium membership. Click: http://deals-now.top/x',
  'Hi, this is John from the bank. Please call us back at your earliest convenience.',
] as const;

export const DANGEROUS_MESSAGES = [
  'URGENT: Your account will be suspended within 24 hours. Verify now: bit.ly/acc-verify',
  'IRS NOTICE: You owe $1,247. Pay immediately to avoid legal action: http://192.168.1.4/pay',
  'Apple Support: Your Apple ID has been locked. Confirm password here: http://apple-id-verify.xyz/login',
  'Dear Customer, we detected unusual activity. Confirm your card number and CVV at tinyurl.com/sec-check',
  'Hi grandma, I lost my phone. Send $500 in Amazon gift cards to this email urgently!!!',
  'Your USPS package failed delivery. Click here: bit.ly/usps-redelivery-now',
] as const;

export const EDGE_CASE_MESSAGES = {
  empty: '',
  whitespace: '   \n\t  ',
  veryShort: 'ok',
  veryLong: 'a'.repeat(5000),
  pureUrl: 'https://bit.ly/x',
  emailLike: 'Contact me at john@example.com for more info',
  versionString: 'Updated to version 2.4.1 successfully',
  cyrillicHomograph: 'Verify your аррӏе.com account', // contains Cyrillic chars
  mixedCase: 'Click HERE to CLAIM your prize NOW!!!',
} as const;
