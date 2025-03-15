// server/api/stripe/checkout.ts
import { defineEventHandler, readRawBody, createError } from 'h3';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export default defineEventHandler(async (event) => {
    // Récupération du corps brut de la requête
    const rawBody = await readRawBody(event);
    const signature = event.req.headers['stripe-signature'];

    // Import dynamique de Stripe pour éviter des conflits d'initialisation
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2022-11-15'
    });

    let stripeEvent;
    try {
        stripeEvent = stripe.webhooks.constructEvent(rawBody, signature as string, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        throw createError({ statusCode: 400, statusMessage: `Webhook Error: ${err.message}` });
    }

    console.log('stripeEvent.type:', stripeEvent.type);

    // Traitement de l'événement checkout.session.completed
    if (stripeEvent.type.trim() === 'checkout.session.completed') {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;

        // Initialiser Supabase avec les clés de service
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // Extraction des données utiles depuis la session
        const { amount_total, currency, id: provider_order_id } = session;

        // Création de la commande dans Supabase
        const { error } = await supabase
            .from('orders')
            .insert([{
                total_amount: amount_total / 100, // conversion des centimes en unité monétaire
                currency: currency.toUpperCase(),
                payment_provider: 'stripe',
                provider_order_id,
                status: 'paid', // ou modifiez le statut selon votre logique métier
            }]);

        if (error) {
            console.error('Erreur lors de la création de la commande dans Supabase:', error);
            throw createError({ statusCode: 500, statusMessage: error.message });
        }
    } else {
        // Pour les autres événements, vous pouvez choisir de logger en debug afin de ne pas alerter inutilement
        console.debug(`Événement non géré : ${stripeEvent.type}`);
    }

    return { received: true };
});
