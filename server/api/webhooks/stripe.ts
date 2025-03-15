import { defineEventHandler, readRawBody, createError } from 'h3';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2022-11-15',
    });

    // Récupération de la signature Stripe dans les headers
    const sig = event.node.req.headers['stripe-signature'];
    // Lecture du corps brut de la requête pour la validation du webhook
    const body = await readRawBody(event);

    let stripeEvent;

    try {
        // Construction de l'événement Stripe en vérifiant la signature
        stripeEvent = stripe.webhooks.constructEvent(body, sig as string, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error('Erreur de validation du webhook :', err);
        throw createError({
            statusCode: 400,
            statusMessage: 'Erreur de validation du webhook',
        });
    }

    // Traitement des différents types d'événements Stripe
    switch (stripeEvent.type) {
        case 'checkout.session.completed': {
            // Traiter l'événement de paiement réussi
            const session = stripeEvent.data.object as Stripe.Checkout.Session;

            // Initialiser Supabase avec les clés de service (pour des opérations sécurisées)
            const supabase = createClient(
                process.env.SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Extraction des informations utiles depuis la session
            const { amount_total, currency, id: provider_order_id } = session;

            // Récupérer les metadata pour entity_type et entity_id
            const metadata = session.metadata || {};
            const entity_type = metadata.entity_type || null;
            const entity_id = metadata.entity_id ? parseInt(metadata.entity_id, 10) : null;

            // Création de l'order dans Supabase en incluant les colonnes entity_type et entity_id
            const { error } = await supabase
                .from('orders')
                .insert([{
                    total_amount: amount_total ? amount_total / 100 : 0, // conversion des centimes en unité monétaire
                    currency: currency.toUpperCase(),
                    payment_provider: 'stripe',
                    provider_order_id,
                    status: 'paid', // ou modifiez le statut selon votre logique métier
                    entity_type,    // par exemple "event"
                    entity_id,      // identifiant numérique de l'événement
                }]);

            if (error) {
                console.error('Erreur lors de la création de la commande dans Supabase:', error);
                throw createError({ statusCode: 500, statusMessage: error.message });
            }

            console.log('Commande créée avec succès dans Supabase.');
            break;
        }
        case 'account.updated': {
            const account = stripeEvent.data.object;
            console.log('Compte mis à jour :', account);
            break;
        }
        case 'account.external_account.created': {
            const externalAccount = stripeEvent.data.object;
            console.log('Compte externe créé :', externalAccount);
            break;
        }
        case 'account.external_account.deleted': {
            const externalAccount = stripeEvent.data.object;
            console.log('Compte externe supprimé :', externalAccount);
            break;
        }
        case 'account.application.deauthorized': {
            const deauthorizedAccount = stripeEvent.data.object;
            console.log('Compte désautorisé :', deauthorizedAccount);
            break;
        }
        default:
            console.warn(`Événement non géré : ${stripeEvent.type}`);
    }

    return { received: true };
});
