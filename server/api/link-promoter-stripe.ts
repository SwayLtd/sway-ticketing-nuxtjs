import { createClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  // Lecture du corps de la requête
  const { promoterId, stripeAccountId } = await readBody(event);
  console.log('--- Link-Promoter-Stripe Endpoint Appelé ---');
  console.log('Promoter ID:', promoterId);
  console.log('Stripe Account ID:', stripeAccountId);

  if (!promoterId || !stripeAccountId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
  }

  // Récupération du token d'accès depuis l'en-tête Authorization
  const authHeader = event.req.headers.authorization;
  if (!authHeader) {
    throw createError({ statusCode: 401, statusMessage: 'Authorization header not found' });
  }

  // Récupération des variables d'environnement depuis le runtime config public
  const config = useRuntimeConfig();
  const supabaseUrl = config.public.SUPABASE_URL;
  const supabaseAnonKey = config.public.SUPABASE_ANON_KEY;

  // Création du client Supabase avec le token d'accès
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader }
    }
  });

  // Mise à jour de la table "promoters"
  const { error, data } = await supabase
    .from('promoters')
    .update({ stripe_account_id: stripeAccountId })
    .eq('id', promoterId)
    .select();

  if (error) {
    console.error('Erreur lors de la mise à jour du promoteur:', error);
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  console.log('Mise à jour réussie, données retournées:', data);
  return { success: true, data };
});
