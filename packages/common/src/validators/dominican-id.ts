export function stripIdFormatting(id: string): string {
  return id.replace(/[-\s]/g, '');
}

export function validateCedula(cedula: string): boolean {
  const cleaned = stripIdFormatting(cedula);
  if (cleaned.length !== 11) return false;
  if (!/^\d{11}$/.test(cleaned)) return false;

  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1];
  let sum = 0;

  for (let i = 0; i < 11; i++) {
    const digit = parseInt(cleaned[i], 10);
    const product = digit * weights[i];
    sum += product >= 10 ? Math.floor(product / 10) + (product % 10) : product;
  }

  return sum % 10 === 0;
}

export function validateRNC(rnc: string): boolean {
  const cleaned = stripIdFormatting(rnc);
  if (cleaned.length !== 9) return false;
  if (!/^\d{9}$/.test(cleaned)) return false;

  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleaned[i], 10) * weights[i];
  }

  const division = Math.floor(sum / 11);
  const remainder = sum - division * 11;

  let checkDigit: number;
  if (remainder === 0) checkDigit = 2;
  else if (remainder === 1) checkDigit = 1;
  else checkDigit = 11 - remainder;

  return checkDigit === parseInt(cleaned[8], 10);
}

export function validateDominicanNationalId(
  id: string,
  type: 'INDIVIDUAL' | 'CORPORATE',
): boolean {
  if (type === 'CORPORATE') return validateRNC(id);
  return validateCedula(id);
}
