import Stripe from 'stripe';

export default defineEventHandler(async (event) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2022-11-15',
    });

    const { accountId } = getQuery(event); // L'ID du compte passé en query string

    if (!accountId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'accountId est requis',
        });
    }

    try {
        const account = await stripe.accounts.retrieve(accountId);
        return account;
    } catch (error) {
        console.error('Erreur lors de la récupération du compte :', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur lors de la récupération du compte',
        });
    }
});
