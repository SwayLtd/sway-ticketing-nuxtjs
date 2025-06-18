export default defineEventHandler(async (event) => {
    // 🔍 LOGS DANS NETLIFY FUNCTIONS
    console.log('=== DEBUG ENV VARS ENDPOINT ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request from:', event.node.req.headers['x-forwarded-for'] || 'localhost');
    
    // Test de chaque variable avec logs
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const baseUrl = process.env.BASE_URL;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('STRIPE_SECRET_KEY:', !!stripeSecretKey, stripeSecretKey ? `(${stripeSecretKey.substring(0, 12)}...)` : 'MANQUANTE');
    console.log('STRIPE_WEBHOOK_SECRET:', !!stripeWebhookSecret, stripeWebhookSecret ? `(${stripeWebhookSecret.substring(0, 12)}...)` : 'MANQUANTE');
    console.log('BASE_URL:', baseUrl || 'MANQUANTE');
    console.log('SUPABASE_URL:', supabaseUrl || 'MANQUANTE');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey, supabaseKey ? `(${supabaseKey.substring(0, 12)}...)` : 'MANQUANTE');
    console.log('==============================');

    // Test RÉEL des variables d'environnement sur Netlify
    return {
        // Variables Stripe (essentielles pour le webhook)
        STRIPE_SECRET_KEY: stripeSecretKey ? 'DÉFINIE (' + stripeSecretKey.substring(0, 20) + '...)' : '❌ MANQUANTE',
        STRIPE_WEBHOOK_SECRET: stripeWebhookSecret ? 'DÉFINIE (' + stripeWebhookSecret.substring(0, 20) + '...)' : '❌ MANQUANTE',
        
        // Variables Supabase
        SUPABASE_URL: supabaseUrl ? 'DÉFINIE' : '❌ MANQUANTE',
        SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? 'DÉFINIE (' + supabaseKey.substring(0, 20) + '...)' : '❌ MANQUANTE',
        
        // Variables générales
        BASE_URL: baseUrl ? baseUrl : '❌ MANQUANTE',
        NODE_ENV: process.env.NODE_ENV || 'undefined',
        
        // Debugging info
        netlify_deploy_id: process.env.DEPLOY_ID || 'non trouvé',
        timestamp: new Date().toISOString()
    }
})
