// server/api/create-checkout-session.ts
import Stripe from 'stripe';
import { defineEventHandler, readBody, createError } from 'h3';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2022-11-15',
});

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { eventId, lineItems, promoterStripeAccountId, currency, feeAmount } = body;

    // Logs pour débuguer les données reçues
    console.log('Création de Checkout Session pour eventId:', eventId);
    console.log('Line Items:', lineItems);
    console.log('Promoter Stripe Account ID:', promoterStripeAccountId);
    console.log('Currency:', currency);
    console.log('Fee Amount (centimes):', feeAmount);

    if (!eventId || !lineItems || !promoterStripeAccountId || !currency || feeAmount == null) {
        throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
    }

    // Utilisation de useRuntimeConfig() pour accéder à BASE_URL
    const config = useRuntimeConfig();

    // Calcul du montant total en centimes
    const totalAmount = lineItems.reduce((acc: number, item: any) => acc + item.amount * item.quantity, 0);

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems.map((item: any) => ({
                price_data: {
                    currency,
                    product_data: { name: item.name },
                    unit_amount: item.amount, // montant en centimes
                },
                quantity: item.quantity,
            })),
            payment_intent_data: {
                application_fee_amount: feeAmount, // Utilise directement le montant des fees envoyé (en centimes)
                transfer_data: {
                    destination: promoterStripeAccountId,
                },
            },
            success_url: `${config.public.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.public.BASE_URL}/cancel`,
        });

        console.log('Session de Checkout créée avec succès:', session);
        return { url: session.url };
    } catch (error: any) {
        console.error('Erreur lors de la création de la session Stripe:', error);
        throw createError({ statusCode: 500, statusMessage: error.message });
    }
});
