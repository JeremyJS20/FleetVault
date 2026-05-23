import Stripe from 'stripe';

function isMockEnvironment(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return !key
    || key.includes('mock')
    || key.includes('placeholder')
    || key.includes('sk_test_...')
    || key === 'dummy';
}

function getStripe(): Stripe | null {
  if (isMockEnvironment()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export class StripeService {
  async attachPaymentMethod(customerId: string, paymentMethodId: string) {
    const stripe = getStripe();
    if (!stripe) {
      console.log(`[MOCK STRIPE] Attached pm ${paymentMethodId} to customer ${customerId}`);
      return { id: customerId };
    }

    try {
      return await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    } catch (error: any) {
      throw new Error(`Stripe attach payment method error: ${error.message}`);
    }
  }

  async createPreAuthHold(amount: number, customerId?: string, paymentMethodId?: string, metadata?: Record<string, string>) {
    const stripe = getStripe();
    if (!stripe) {
      console.log(`[MOCK STRIPE] Created Pre-Auth Hold for $${amount}`);
      return {
        id: `mock_pi_${Math.random().toString(36).substring(7)}`,
        status: 'requires_capture',
        client_secret: `mock_client_secret_${Math.random().toString(36).substring(7)}`,
      };
    }

    const amountInCents = Math.round(amount * 100);

    try {
      const params: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency: 'dop',
        payment_method_types: ['card'],
        capture_method: 'manual',
        metadata,
      };
      if (customerId) params.customer = customerId;
      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
        params.confirm = true;
      }

      const paymentIntent = await stripe.paymentIntents.create(params);
      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async capturePayment(paymentIntentId: string, amount: number) {
    if (!paymentIntentId || paymentIntentId.startsWith('mock_pi_')) {
      console.log(`[MOCK STRIPE] Captured $${amount} on hold ${paymentIntentId}`);
      return {
        id: paymentIntentId || `mock_pi_fallback`,
        status: 'succeeded',
      };
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured, but a real PaymentIntent ID was provided');
    }

    const amountInCents = Math.round(amount * 100);

    try {
      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
        amount_to_capture: amountInCents,
      });
      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Stripe capture error: ${error.message}`);
    }
  }

  async cancelHold(paymentIntentId: string) {
    if (!paymentIntentId || paymentIntentId.startsWith('mock_pi_')) {
      console.log(`[MOCK STRIPE] Cancelled hold ${paymentIntentId}`);
      return {
        id: paymentIntentId || `mock_pi_fallback`,
        status: 'canceled',
      };
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured, but a real PaymentIntent ID was provided');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Stripe cancel error: ${error.message}`);
    }
  }

  async createCustomer(email: string, name: string) {
    const stripe = getStripe();
    if (!stripe) {
      console.log(`[MOCK STRIPE] Created Stripe Customer for ${email}`);
      return {
        id: `mock_cus_${Math.random().toString(36).substring(7)}`,
      };
    }

    try {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) {
        console.log(`[STRIPE] Found existing customer for ${email}: ${existing.data[0].id}`);
        return existing.data[0];
      }

      const customer = await stripe.customers.create({
        email,
        name,
      });
      return customer;
    } catch (error: any) {
      throw new Error(`Stripe customer creation error: ${error.message}`);
    }
  }

  async createCharge(amount: number, customerId?: string, metadata?: Record<string, any>) {
    const stripe = getStripe();
    if (!stripe) {
      console.log(`[MOCK STRIPE] Created Immediate Charge for $${amount}`);
      return {
        id: `mock_pi_${Math.random().toString(36).substring(7)}`,
        status: 'succeeded',
      };
    }

    const amountInCents = Math.round(amount * 100);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'dop',
        payment_method_types: ['card'],
        capture_method: 'automatic',
        customer: customerId,
        metadata,
      });
      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Stripe charge error: ${error.message}`);
    }
  }

  async listCustomerCards(stripeCustomerId: string) {
    const stripe = getStripe();
    if (!stripe) {
      console.log(`[MOCK STRIPE] Listing cards for customer ${stripeCustomerId}`);
      return [
        {
          id: 'pm_mock_visa',
          card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2028 },
          billing_details: { name: 'John Doe' },
        },
        {
          id: 'pm_mock_mastercard',
          card: { brand: 'mastercard', last4: '5555', exp_month: 10, exp_year: 2029 },
          billing_details: { name: 'John Doe' },
        }
      ];
    }

    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error: any) {
      throw new Error(`Stripe list payment methods error: ${error.message}`);
    }
  }

  async getPaymentIntent(paymentIntentId: string) {
    const stripe = getStripe();
    if (!stripe) {
      return {
        id: paymentIntentId,
        payment_method: 'pm_mock_visa',
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Stripe retrieve payment intent error: ${error.message}`);
    }
  }

  async detachPaymentMethod(paymentMethodId: string) {
    const stripe = getStripe();
    if (!stripe) {
      console.log(`[MOCK STRIPE] Detached payment method ${paymentMethodId}`);
      return { id: paymentMethodId };
    }

    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      return paymentMethod;
    } catch (error: any) {
      throw new Error(`Stripe detach payment method error: ${error.message}`);
    }
  }
}
