import Stripe from 'stripe';

export default defineEventHandler(async (event) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2022-11-15',
    });

    // Récupération de la signature Stripe dans les headers
    const sig = event.node.req.headers['stripe-signature'];
    // Lecture du corps brut de la requête pour la validation du webhook
    const body = await readRawBody(event);

    let stripeEvent;

    try {
        // Construction de l'événement Stripe en vérifiant la signature
        stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Erreur de validation du webhook :', err);
        throw createError({
            statusCode: 400,
            statusMessage: 'Erreur de validation du webhook',
        });
    }

    // Traitement des différents types d'événements Stripe
    switch (stripeEvent.type) {
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
