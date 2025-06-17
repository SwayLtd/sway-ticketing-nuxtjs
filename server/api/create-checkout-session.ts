import Stripe from 'stripe';
import { defineEventHandler, readBody, createError } from 'h3';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    // On attend de recevoir feeAmount en centimes, calculé côté front-end comme la commission nette
    const { eventId, lineItems, promoterStripeAccountId, currency, feeAmount, buyerEmail, userId } = body;

    // Debug logs pour identifier les paramètres manquants
    console.log('API Debug - Paramètres reçus:');
    console.log('eventId:', eventId);
    console.log('lineItems:', lineItems);
    console.log('promoterStripeAccountId:', promoterStripeAccountId);
    console.log('currency:', currency);
    console.log('feeAmount:', feeAmount);
    console.log('buyerEmail:', buyerEmail);
    console.log('userId:', userId);
    console.log('Body complet:', body);

    if (!eventId || !lineItems || !promoterStripeAccountId || !currency || feeAmount == null || !buyerEmail) {
        console.error('Paramètres manquants détectés:');
        console.error('eventId manquant:', !eventId);
        console.error('lineItems manquant:', !lineItems);
        console.error('promoterStripeAccountId manquant:', !promoterStripeAccountId);
        console.error('currency manquant:', !currency);
        console.error('feeAmount manquant:', feeAmount == null);
        console.error('buyerEmail manquant:', !buyerEmail);
        throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
    }

    const config = useRuntimeConfig();
    // Calcul du montant total (pour information)
    const totalAmount = lineItems.reduce((acc: number, item: any) => acc + item.amount * item.quantity, 0);

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems.map((item: any) => ({
                price_data: {
                    currency,
                    product_data: {
                        name: item.name,
                        metadata: item.product_id ? { product_id: item.product_id } : {}
                    },
                    unit_amount: item.amount, // en centimes
                },
                quantity: item.quantity,
            })),
            payment_intent_data: {
                application_fee_amount: feeAmount,
                transfer_data: {
                    destination: promoterStripeAccountId,
                },
            },
            // Ajout de metadata globale incluant les informations sur l'événement et l'utilisateur
            metadata: {
                entity_type: 'event',
                entity_id: eventId.toString(),
                buyer_email: buyerEmail,
                user_id: userId ? userId.toString() : '',
            },
            success_url: `${config.public.BASE_URL}/success?provider_order_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.public.BASE_URL}/cancel`,
        });

        return { url: session.url };
    } catch (error: any) {
        console.error('Erreur lors de la création de la session Stripe:', error);
        throw createError({ statusCode: 500, statusMessage: error.message });
    }
});
