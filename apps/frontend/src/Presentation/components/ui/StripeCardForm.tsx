import React, { useState } from 'react';
import { Input } from './Input.js';
import { FormField } from './FormField.js';
import { CreditCard, Calendar, Lock } from 'lucide-react';

interface StripeCardFormProps {
  onCardComplete: (stripePaymentMethodId: string | null) => void;
}

export const StripeCardForm: React.FC<StripeCardFormProps> = ({ onCardComplete }) => {
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let matches = value.match(/\d{4,16}/g);
    let match = (matches && matches[0]) || '';
    let parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      const formatted = parts.join(' ');
      setCardNumber(formatted);
      validateCard(name, formatted, expiry, cvc);
    } else {
      setCardNumber(value);
      onCardComplete(null);
    }
  };

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    setExpiry(value);
    validateCard(name, cardNumber, value, cvc);
  };

  // Format CVC (max 4 digits)
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvc(value);
    validateCard(name, cardNumber, expiry, value);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    validateCard(value, cardNumber, expiry, cvc);
  };

  const validateCard = (cName: string, cNum: string, cExp: string, cCvc: string) => {
    const cleanNum = cNum.replace(/\s+/g, '');
    const expParts = cExp.split('/');

    if (!cName.trim()) {
      onCardComplete(null);
      return;
    }

    if (cleanNum.length < 15 || cleanNum.length > 16) {
      onCardComplete(null);
      return;
    }

    if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length !== 2) {
      onCardComplete(null);
      return;
    }

    const month = parseInt(expParts[0]);
    if (month < 1 || month > 12) {
      onCardComplete(null);
      return;
    }

    if (cCvc.length < 3) {
      onCardComplete(null);
      return;
    }

    setError(null);
    // Card is valid, trigger callback with a mock Stripe payment method token
    onCardComplete(`pm_mock_${Math.random().toString(36).substring(7)}`);
  };

  return (
    <div className="p-5 rounded-2xl border border-border-surface/40 bg-bg-surface/30 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border-surface/20">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-primary flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5" />
          Secure Payment Details
        </span>
        <div className="flex gap-1">
          <span className="w-6 h-4 rounded bg-white/10 border border-white/20 flex items-center justify-center text-[7px] text-white/50 font-bold uppercase">Visa</span>
          <span className="w-6 h-4 rounded bg-white/10 border border-white/20 flex items-center justify-center text-[7px] text-white/50 font-bold uppercase">MC</span>
          <span className="w-6 h-4 rounded bg-white/10 border border-white/20 flex items-center justify-center text-[7px] text-white/50 font-bold uppercase">Amex</span>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg text-xs font-semibold bg-accent-error/10 border border-accent-error/20 text-accent-error">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <FormField label="Cardholder Name" required>
          <Input
            type="text"
            placeholder="Johnathan Doe"
            value={name}
            onChange={handleNameChange}
            className="!h-9 rounded-lg"
          />
        </FormField>

        <FormField label="Card Number" required>
          <div className="relative">
            <Input
              type="text"
              placeholder="4111 1111 1111 1111"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength={19}
              className="!h-9 rounded-lg pl-9"
            />
            <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-fg-tertiary" />
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Expiry Date" required>
            <div className="relative">
              <Input
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={handleExpiryChange}
                maxLength={5}
                className="!h-9 rounded-lg pl-9"
              />
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-fg-tertiary" />
            </div>
          </FormField>

          <FormField label="CVC" required>
            <div className="relative">
              <Input
                type="text"
                placeholder="123"
                value={cvc}
                onChange={handleCvcChange}
                maxLength={4}
                className="!h-9 rounded-lg pl-9"
              />
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-fg-tertiary" />
            </div>
          </FormField>
        </div>
      </div>
    </div>
  );
};
export default StripeCardForm;
