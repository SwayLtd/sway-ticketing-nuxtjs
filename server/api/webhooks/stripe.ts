import { defineEventHandler, readRawBody, createError } from 'h3';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2022-11-15',
    });

    const sig = event.node.req.headers['stripe-signature'];
    const body = await readRawBody(event);

    let stripeEvent;
    try {
        stripeEvent = stripe.webhooks.constructEvent(
            body,
            sig as string,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error('Erreur de validation du webhook :', err);
        throw createError({
            statusCode: 400,
            statusMessage: 'Erreur de validation du webhook',
        });
    }

    switch (stripeEvent.type) {
        case 'checkout.session.completed': {
            const session = stripeEvent.data.object as Stripe.Checkout.Session;

            const supabase = createClient(
                process.env.SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { amount_total, currency, id: provider_order_id } = session;
            const buyer_email = session.customer_details?.email || null;
            const metadata = session.metadata || {};
            const entity_type = metadata.entity_type || null;
            const entity_id = metadata.entity_id ? parseInt(metadata.entity_id, 10) : null;
            const user_id = metadata.user_id ? parseInt(metadata.user_id, 10) : null;

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    total_amount: amount_total ? amount_total / 100 : 0,
                    currency: currency.toUpperCase(),
                    payment_provider: 'stripe',
                    provider_order_id,
                    status: 'paid',
                    entity_type,
                    entity_id,
                    buyer_email,
                    user_id,
                }])
                .select();

            if (orderError || !orderData || orderData.length === 0) {
                console.error('Erreur lors de la création de la commande dans Supabase:', orderError);
                throw createError({ statusCode: 500, statusMessage: orderError?.message || 'Erreur lors de la création de la commande' });
            }

            const orderId = orderData[0].id;
            console.log('Commande créée avec succès dans Supabase, ID:', orderId);

            try {
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
                    expand: ['data.price.product'],
                    limit: 100,
                });

                const orderProducts = lineItems.data.map(item => {
                    const product_id =
                        item.price?.product && typeof item.price.product === 'object'
                            ? item.price.product.metadata?.product_id
                            : null;

                    if (!product_id) {
                        console.warn(`Aucun product_id trouvé pour le line item avec quantity ${item.quantity}.`);
                    }

                    const quantity = item.quantity;
                    const price = item.price?.unit_amount ? item.price.unit_amount / 100 : null;
                    return {
                        order_id: orderId,
                        product_id,
                        quantity,
                        price,
                    };
                });

                // Filtrer en excluant tout item où product_id est null ou undefined
                const validOrderProducts = orderProducts.filter(item => item.product_id != null);

                if (validOrderProducts.length === 0) {
                    console.warn("Aucun line item valide (avec product_id) n'a été trouvé. Aucune insertion dans order_products.");
                } else {
                    const { error: orderProductsError } = await supabase
                        .from('order_products')
                        .insert(validOrderProducts);

                    if (orderProductsError) {
                        console.error('Erreur lors de l\'insertion dans order_products:', orderProductsError);
                        throw createError({ statusCode: 500, statusMessage: orderProductsError.message });
                    }
                    console.log('Line items insérés avec succès dans order_products.');

                    // Déclencher l'Edge Function pour générer les tickets
                    const edgeFunctionUrl = 'https://gvuwtsdhgqefamzyfyjm.functions.supabase.co/generate-tickets';
                    const edgePayload = { order_id: orderId };

                    // Assurez-vous que le Content-Type est bien application/json
                    const edgeResponse = await fetch(edgeFunctionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(edgePayload),
                    });

                    if (!edgeResponse.ok) {
                        const errorText = await edgeResponse.text();
                        console.error("Erreur lors du déclenchement de generate-tickets:", errorText);
                        throw createError({ statusCode: edgeResponse.status, statusMessage: errorText });
                    } else {
                        console.log("Edge Function generate-tickets déclenchée avec succès.");
                    }
                }
            } catch (lineItemError: any) {
                console.error('Erreur lors de la récupération des line items Stripe:', lineItemError);
                throw createError({ statusCode: 500, statusMessage: lineItemError.message });
            }
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
