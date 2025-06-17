export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()

    return {
        supabase_url: config.public.SUPABASE_URL ? 'défini' : 'non défini',
        supabase_anon_key: config.public.SUPABASE_ANON_KEY ? 'défini' : 'non défini',
        supabase_service_role_key: config.SUPABASE_SERVICE_ROLE_KEY ? 'défini' : 'non défini',
        environment: process.env.NODE_ENV
    }
})
