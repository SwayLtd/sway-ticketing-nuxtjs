import { createClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
    // Lecture du corps de la requête
    const { userId, stripeAccountId, email } = await readBody(event);
    console.log('--- Link-Stripe Endpoint Appelé ---');
    console.log('User ID (supabase_id):', userId);
    console.log('Stripe Account ID:', stripeAccountId);
    console.log('Email:', email);

    if (!userId || !stripeAccountId || !email) {
        throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
    }

    // Récupération du token d'accès depuis l'en-tête Authorization de la requête
    const authHeader = event.req.headers.authorization;
    if (!authHeader) {
        throw createError({ statusCode: 401, statusMessage: 'Authorization header not found' });
    }

    // Récupération des variables d'environnement depuis le runtime config public
    const config = useRuntimeConfig();
    const supabaseUrl = config.public.SUPABASE_URL;
    const supabaseAnonKey = config.public.SUPABASE_ANON_KEY;

    // Création du client Supabase en incluant le token d'accès dans les headers
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: { Authorization: authHeader }
        }
    });

    // Mise à jour de la table "users" avec la politique RLS "Users: Update own user"
    const { error, data } = await supabase
        .from('users')
        .update({ stripe_account_id: stripeAccountId, email })
        .eq('supabase_id', userId)
        .select(); // Utilisez .select() pour récupérer l'enregistrement mis à jour (si la politique le permet)

    if (error) {
        console.error('Erreur lors de la mise à jour du compte Stripe Connect :', error);
        throw createError({ statusCode: 500, statusMessage: error.message });
    }

    console.log('Mise à jour réussie, données retournées:', data);
    return { success: true, data };
});
