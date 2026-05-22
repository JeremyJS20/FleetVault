import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { FormField } from './FormField.js';
import { CreditCard, Lock } from 'lucide-react';

interface StripeCardFormProps {
  onCardComplete: (stripePaymentMethodId: string | null) => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '14px',
      fontFamily: 'inherit',
      color: '#e2e8f0',
      '::placeholder': { color: '#64748b' },
    },
    invalid: { color: '#ef4444' },
  },
};

export const StripeCardForm: React.FC<StripeCardFormProps> = ({ onCardComplete }) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  React.useEffect(() => {
    onCardComplete(null);
  }, []);

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!name.trim()) {
      setError('Cardholder name is required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setIsProcessing(false);
      return;
    }

    const { error: submitError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { name: name.trim() },
    });

    if (submitError) {
      setError(submitError.message || 'Card validation failed');
      onCardComplete(null);
      setIsProcessing(false);
      return;
    }

    onCardComplete(paymentMethod.id);
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-2xl border border-border-surface/40 bg-bg-surface/30 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border-surface/20">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-primary flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5" />
          {t('stripe.securePayment')}
        </span>
        <Lock className="w-3.5 h-3.5 text-fg-tertiary" />
      </div>

      <FormField label={t('stripe.cardholderName')} required>
        <Input
          type="text"
          placeholder={t('stripe.cardholderPlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="!h-9 rounded-lg"
        />
      </FormField>

      <div className="p-3 rounded-xl border border-border-surface/30 bg-bg-inset/50">
        <CardElement options={CARD_ELEMENT_OPTIONS} onChange={handleCardChange} />
      </div>

      {error && (
        <div className="p-2.5 rounded-lg text-xs font-semibold bg-accent-error/10 border border-accent-error/20 text-accent-error">
          {error}
        </div>
      )}

      <Button
        type="submit"
        isLoading={isProcessing}
        disabled={!stripe || !cardComplete || !name.trim()}
        className="w-full"
      >
        {t('stripe.confirmCard')}
      </Button>
    </form>
  );
};
