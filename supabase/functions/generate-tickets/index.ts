import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

// Helper function to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Function to create an HMAC using Web Crypto API
async function createHmac(hmacToken: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(hmacToken);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = encoder.encode(message);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return bufferToHex(signature);
}

// Récupérer les variables d'environnement
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req: Request) => {
  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Retrieve order from "orders" table
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Assume order.entity_type is "event" and order.entity_id is the event ID.
    const event_id = order.entity_id;

    // 2. Retrieve the event to get its hmac_token
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("hmac_token")
      .eq("id", event_id)
      .single();
    if (eventError || !eventData) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const hmac_token = eventData.hmac_token;

    // 3. Retrieve purchased products for the order, joining with products to get type
    const { data: orderProducts, error: opError } = await supabase
      .from("order_products")
      .select(`
         id,
         product_id,
         quantity,
         products ( type )
      `)
      .eq("order_id", order_id);
    if (opError) {
      return new Response(
        JSON.stringify({ error: "Error fetching order products" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Generate a unique customization token for this order
    const customization_token = crypto.randomUUID();
    let ticketsCreated = 0;

    // For each purchased product of type "ticket"
    for (const op of orderProducts) {
      if (op.products && op.products.type === "ticket") {
        // Count already created tickets for this order_id and product_id.
        const { count, error: countError } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("order_id", order_id)
          .eq("product_id", op.product_id);
        if (countError) {
          console.error("Error counting tickets:", countError);
          continue;
        }
        const existingCount = count || 0;
        const missing = op.quantity - existingCount;
        for (let i = 0; i < missing; i++) {
          // Create message for HMAC using order_id, product_id, and index
          const message = `${order_id}:${op.product_id}:${i}`;
          const qr_code_data = await createHmac(hmac_token, message);
          const { error: insertError } = await supabase
            .from("tickets")
            .insert({
              order_id: order_id,
              product_id: op.product_id,
              event_id: event_id,
              qr_code_data: qr_code_data,
              status: "valid",
              customization_token: customization_token,
              customization_data: null,
            });
          if (insertError) {
            console.error("Error inserting ticket:", insertError);
          } else {
            ticketsCreated++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Tickets generated", ticketsCreated }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
