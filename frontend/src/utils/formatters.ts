/**
 * Utility to format GEN currency values gracefully.
 * Automatically handles 18-decimal wei amounts as well as whole token units.
 */
export function formatGEN(val: string | bigint | number | undefined | null): string {
  if (!val) return '0';
  try {
    const rawStr = String(val).trim();
    if (!rawStr || rawStr === '0') return '0';

    const b = BigInt(rawStr);
    if (b === 0n) return '0';

    // If the number is in 18-decimals Wei (>= 10^14)
    if (b >= 10n ** 14n) {
      const whole = b / (10n ** 18n);
      const rem = (b % (10n ** 18n)) / (10n ** 14n); // up to 4 decimal places
      if (rem > 0n) {
        const dec = rem.toString().padStart(4, '0').replace(/0+$/, '');
        return `${Number(whole).toLocaleString()}.${dec}`;
      }
      return Number(whole).toLocaleString();
    }

    // Otherwise it's already in whole units
    return Number(b).toLocaleString();
  } catch {
    return String(val);
  }
}
