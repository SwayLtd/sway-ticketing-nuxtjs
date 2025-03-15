// supabase/functions/create-tickets/index.ts
import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

serve(async (req) => {
    try {
        // Récupérez le corps de la requête, par exemple en JSON
        const body = await req.json();
        const { order_id, entity_id, line_items } = body;
        // line_items devrait contenir les produits achetés (avec quantité, product_id, etc.)

        // Initialiser le client Supabase avec la clé Service Role (définie dans vos variables d'environnement)
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Construire les tickets à insérer
        const ticketsToInsert = [];
        for (const item of line_items) {
            // On suppose que l'on veut créer un ticket pour chaque unité (excluant les frais)
            if (item.name === "Stripe Fees" || item.name === "Fees") continue;
            const quantity = item.quantity || 0;
            const product_id = item.product_id || null;

            for (let i = 0; i < quantity; i++) {
                ticketsToInsert.push({
                    order_id,
                    product_id,
                    event_id: entity_id,
                    qr_code_data: crypto.randomUUID(), // Génère un QR code data unique
                    status: "valid",
                });
            }
        }

        if (ticketsToInsert.length > 0) {
            const { error } = await supabase
                .from("tickets")
                .insert(ticketsToInsert);
            if (error) {
                console.error("Erreur lors de l'insertion des tickets:", error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
        }

        return new Response(JSON.stringify({ message: "Tickets créés avec succès." }), { status: 200 });
    } catch (err) {
        console.error("Erreur dans la fonction create-tickets:", err);
        return new Response(JSON.stringify({ error: "Erreur interne." }), { status: 500 });
    }
});
