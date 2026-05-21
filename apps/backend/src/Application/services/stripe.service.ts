import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

const isMockKey = !stripeSecretKey
  || stripeSecretKey.includes('mock')
  || stripeSecretKey.includes('placeholder')
  || stripeSecretKey.includes('sk_test_...')
  || stripeSecretKey === 'dummy';

const stripe = !isMockKey ? new Stripe(stripeSecretKey) : null;

export class StripeService {
  // Method to create a pre-auth payment intent hold
  async createPreAuthHold(amount: number, customerId?: string, metadata?: Record<string, string>) {
    const amountInCents = Math.round(amount * 100);
    
    if (isMockKey || !stripe) {
      console.log(`[MOCK STRIPE] Created Pre-Auth Hold for $${amount}`);
      return {
        id: `mock_pi_${Math.random().toString(36).substring(7)}`,
        status: 'requires_capture',
        client_secret: `mock_client_secret_${Math.random().toString(36).substring(7)}`,
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        payment_method_types: ['card'],
        capture_method: 'manual', // This creates the hold
        customer: customerId,
        metadata,
      });

      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  // Method to capture payment on return
  async capturePayment(paymentIntentId: string, amount: number) {
    if (!paymentIntentId || paymentIntentId.startsWith('mock_pi_')) {
      console.log(`[MOCK STRIPE] Captured $${amount} on hold ${paymentIntentId}`);
      return {
        id: paymentIntentId || `mock_pi_fallback`,
        status: 'succeeded',
      };
    }

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

  // Method to cancel a hold
  async cancelHold(paymentIntentId: string) {
    if (!paymentIntentId || paymentIntentId.startsWith('mock_pi_')) {
      console.log(`[MOCK STRIPE] Cancelled hold ${paymentIntentId}`);
      return {
        id: paymentIntentId || `mock_pi_fallback`,
        status: 'canceled',
      };
    }

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

  // Method to create a stripe customer account
  async createCustomer(email: string, name: string) {
    if (!stripe || !stripeSecretKey || stripeSecretKey.startsWith('dummy') || stripeSecretKey.includes('sk_test_placeholder') || stripeSecretKey.includes('sk_test_...')) {
      console.log(`[MOCK STRIPE] Created Stripe Customer for ${email}`);
      return {
        id: `mock_cus_${Math.random().toString(36).substring(7)}`,
      };
    }

    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });
      return customer;
    } catch (error: any) {
      throw new Error(`Stripe customer creation error: ${error.message}`);
    }
  }

  // Method to create an immediate charge
  async createCharge(amount: number, customerId?: string, metadata?: Record<string, any>) {
    const amountInCents = Math.round(amount * 100);

    if (!stripe || !stripeSecretKey || stripeSecretKey.startsWith('dummy') || stripeSecretKey.includes('sk_test_placeholder') || stripeSecretKey.includes('sk_test_...')) {
      console.log(`[MOCK STRIPE] Created Immediate Charge for $${amount}`);
      return {
        id: `mock_pi_${Math.random().toString(36).substring(7)}`,
        status: 'succeeded',
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
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
}
