// Utility function to format numbers to a maximum of 2 decimal places
export const formatNumber = (value: number | string | undefined, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
  if (isNaN(num)) return '0';
  return Number(num.toFixed(decimals)).toString();
};

// Helper for formatting with units
export const formatWithUnit = (value: number | string | undefined, unit: string, decimals: number = 2): string => {
  return `${formatNumber(value, decimals)}${unit}`;
};