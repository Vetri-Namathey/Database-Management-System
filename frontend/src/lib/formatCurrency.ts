export function formatCurrencyCrore(valueInCrores: number | null | undefined) {
  if (valueInCrores == null || Number.isNaN(Number(valueInCrores))) return '₹0';
  // Keep one decimal if fractional, otherwise no decimals
  const v = Number(valueInCrores);
  return `₹${v % 1 === 0 ? v : v.toFixed(2)} Cr`;
}

export function formatCurrencyLakhs(valueInLakhs: number | null | undefined) {
  if (valueInLakhs == null || Number.isNaN(Number(valueInLakhs))) return '₹0';
  const v = Number(valueInLakhs);
  return `₹${v % 1 === 0 ? v : v.toFixed(2)} Lakhs`;
}

// Generic: choose Lakhs for amounts < 1 Cr, otherwise show in Cr
export function formatBidAmount(amountInCrores: number | null | undefined) {
  if (amountInCrores == null || Number.isNaN(Number(amountInCrores))) return '₹0';
  const v = Number(amountInCrores);
  if (v < 1) {
    // convert to lakhs: 1 crore = 100 lakhs
    const lakhs = Math.round(v * 100 * 100) / 100; // keep two decimals
    return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(2)} Lakhs`;
  }
  return formatCurrencyCrore(v);
}
