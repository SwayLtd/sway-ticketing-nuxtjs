// server/api/create-checkout-session.ts
import Stripe from 'stripe';
import { defineEventHandler, readBody, createError } from 'h3';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2022-11-15',
});

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    // On attend de recevoir feeAmount en centimes, calculé côté front-end comme la commission nette
    const { eventId, lineItems, promoterStripeAccountId, currency, feeAmount } = body;

    if (!eventId || !lineItems || !promoterStripeAccountId || !currency || feeAmount == null) {
        throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
    }

    const config = useRuntimeConfig();
    // Le totalAmount ici est uniquement pour information ; il n'est pas utilisé pour la commission
    const totalAmount = lineItems.reduce((acc: number, item: any) => acc + item.amount * item.quantity, 0);

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems.map((item: any) => ({
                price_data: {
                    currency,
                    product_data: { name: item.name },
                    unit_amount: item.amount, // en centimes
                },
                quantity: item.quantity,
            })),
            payment_intent_data: {
                // On fixe application_fee_amount avec feeAmount, c'est-à-dire votre commission nette (en centimes)
                application_fee_amount: feeAmount,
                transfer_data: {
                    destination: promoterStripeAccountId,
                },
            },
            success_url: `${config.public.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.public.BASE_URL}/cancel`,
        });

        return { url: session.url };
    } catch (error: any) {
        console.error('Erreur lors de la création de la session Stripe:', error);
        throw createError({ statusCode: 500, statusMessage: error.message });
    }
});
