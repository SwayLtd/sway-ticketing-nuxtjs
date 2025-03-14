// server/api/create-checkout-session.ts
import Stripe from 'stripe';
import { defineEventHandler, readBody, createError } from 'h3';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2022-11-15',
});

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { eventId, lineItems, promoterStripeAccountId, currency } = body;

    if (!eventId || !lineItems || !promoterStripeAccountId || !currency) {
        throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
    }

    // Utilisation directe de useRuntimeConfig() (disponible globalement dans Nuxt 3)
    const config = useRuntimeConfig();

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems.map((item: any) => ({
                price_data: {
                    currency,
                    product_data: { name: item.name },
                    unit_amount: item.amount, // Montant en centimes
                },
                quantity: item.quantity,
            })),
            transfer_data: {
                destination: promoterStripeAccountId,
            },
            // Calcul d'une commission de 10% par exemple
            application_fee_amount: Math.round(
                lineItems.reduce((acc: number, item: any) => acc + item.amount * item.quantity, 0) * 0.1
            ),
            success_url: `${config.public.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.public.BASE_URL}/cancel`,
        });

        return { url: session.url };
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        throw createError({ statusCode: 500, statusMessage: error.message });
    }
});
