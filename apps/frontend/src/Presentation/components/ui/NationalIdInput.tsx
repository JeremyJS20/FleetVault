import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';
import { validateDominicanNationalId, stripIdFormatting } from '@rent-car/common';
import { FormField } from './FormField.js';
import { Input } from './Input.js';

interface NationalIdInputProps {
  value: string;
  onChange: (value: string) => void;
  type: 'INDIVIDUAL' | 'CORPORATE';
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export const NationalIdInput: React.FC<NationalIdInputProps> = ({
  value,
  onChange,
  type,
  required,
  placeholder,
  className = '',
}) => {
  const { t } = useTranslation();

  const validation = useMemo(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return { isValid: false, error: null, showIcon: false };
    const cleaned = stripIdFormatting(trimmed);
    if (cleaned.length === 0) return { isValid: false, error: null, showIcon: false };
    const valid = validateDominicanNationalId(trimmed, type);
    return {
      isValid: valid,
      error: valid
        ? null
        : type === 'INDIVIDUAL'
          ? t('customers.invalidCedula', 'Invalid cédula (must be 11 digits with valid check digit)')
          : t('customers.invalidRnc', 'Invalid RNC (must be 9 digits with valid check digit)'),
      showIcon: true,
    };
  }, [value, type, t]);

  const label = type === 'INDIVIDUAL' ? t('customers.cedula', 'Cédula') : t('customers.rnc', 'RNC');

  return (
    <FormField label={label} error={validation.error ?? undefined} required={required}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? (type === 'INDIVIDUAL' ? '000-0000000-0' : '0-00-00000-0')}
          error={validation.showIcon && !validation.isValid}
          className={`${className}`}
        />
        {validation.showIcon && value.trim().length > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {validation.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </span>
        )}
      </div>
    </FormField>
  );
};
