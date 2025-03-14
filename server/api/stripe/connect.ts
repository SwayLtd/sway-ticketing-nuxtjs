import Stripe from 'stripe';

export default defineEventHandler(async (event) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2022-11-15',
    });

    const body = await readBody(event);

    try {
        // Créez un compte connecté
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'BE',
            email: body.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });

        // Utilisation de la variable BASE_URL pour construire les URLs de redirection.
        // Par défaut, utilise localhost en développement.
        const baseUrl = process.env.BASE_URL;

        // Générez un lien d'authentification pour l'onboarding en incluant l'ID du compte dans l'URL de retour.
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${baseUrl}/reauth`,
            return_url: `${baseUrl}/return?accountId=${account.id}`,
            type: 'account_onboarding',
        });

        return { url: accountLink.url };
    } catch (error) {
        console.error('Erreur lors de la création du compte connecté :', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur lors de la création du compte connecté',
        });
    }
});
