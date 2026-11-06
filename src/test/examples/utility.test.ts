import { describe, it, expect } from 'vitest';

// Example utility function to test
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

describe('formatPhoneNumber', () => {
  it('formats a 10-digit phone number correctly', () => {
    expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
  });

  it('handles phone numbers with existing formatting', () => {
    expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
  });

  it('returns original string if not 10 digits', () => {
    expect(formatPhoneNumber('123')).toBe('123');
    expect(formatPhoneNumber('12345678901')).toBe('12345678901');
  });

  it('handles empty string', () => {
    expect(formatPhoneNumber('')).toBe('');
  });
});
