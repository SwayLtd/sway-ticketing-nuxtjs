import { defineEventHandler, readRawBody, createError } from 'h3';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Make sure the path is correct and the file exists; adjust the path if needed
import { sendOrderSummaryEmail } from '../../utils/email';

export default defineEventHandler(async (event) => {
    // 🔍 LOGS DE DEBUG - Variables d'environnement
    console.log('=== WEBHOOK STRIPE DEBUG ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('STRIPE_SECRET_KEY présente:', !!process.env.STRIPE_SECRET_KEY, process.env.STRIPE_SECRET_KEY ? `(${process.env.STRIPE_SECRET_KEY.substring(0, 12)}...)` : 'MANQUANTE');
    console.log('STRIPE_WEBHOOK_SECRET présente:', !!process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SECRET ? `(${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 12)}...)` : 'MANQUANTE');
    console.log('SUPABASE_URL présente:', !!process.env.SUPABASE_URL, process.env.SUPABASE_URL || 'MANQUANTE');
    console.log('SUPABASE_SERVICE_ROLE_KEY présente:', !!process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY ? `(${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 12)}...)` : 'MANQUANTE');
    console.log('BASE_URL présente:', !!process.env.BASE_URL, process.env.BASE_URL || 'MANQUANTE');
    console.log('=============================');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-02-24.acacia',
    });    const sig = event.node.req.headers['stripe-signature'];
    const body = await readRawBody(event);

    if (!body) {
        console.error('Corps de la requête manquant');
        throw createError({
            statusCode: 400,
            statusMessage: 'Corps de la requête manquant',
        });
    }

    if (!sig) {
        console.error('Header stripe-signature manquant');
        throw createError({
            statusCode: 400,
            statusMessage: 'Header stripe-signature manquant',
        });
    }

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

    console.log('Webhook reçu:', stripeEvent.type, stripeEvent.id);

    switch (stripeEvent.type) {
        case 'checkout.session.completed': {
            try {
                console.log('Traitement checkout.session.completed pour:', stripeEvent.id);
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

                console.log('Création de la commande pour session:', provider_order_id);

                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert([{
                        payment_provider: 'stripe',
                        provider_order_id,
                        status: 'paid',
                        entity_type,
                        entity_id,
                        buyer_email,
                        user_id,
                    }])
                    .select(); if (orderError || !orderData || orderData.length === 0) {
                        console.error('Erreur lors de la création de la commande dans Supabase:', orderError);
                        throw createError({ statusCode: 500, statusMessage: orderError?.message || 'Erreur lors de la création de la commande' });
                    }

                const orderId = orderData[0].id;
                console.log('Commande créée avec succès dans Supabase, ID:', orderId);

                try {
                    console.log('Récupération des line items pour session:', session.id);
                    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
                        expand: ['data.price.product'],
                        limit: 100,
                    });

                    console.log('Line items récupérés:', lineItems.data.length); const orderProducts = lineItems.data.map(item => {
                        const product_id =
                            item.price?.product && typeof item.price.product === 'object' && 'metadata' in item.price.product
                                ? item.price.product.metadata?.product_id
                                : null;

                        if (!product_id) {
                            console.warn(`Aucun product_id trouvé pour le line item ${item.description} avec quantity ${item.quantity}.`);
                        } else {
                            console.log(`Product ID trouvé: ${product_id} pour ${item.description}`);
                        }

                        const quantity = item.quantity;
                        const price = item.price?.unit_amount ? item.price.unit_amount / 100 : null;
                        return {
                            order_id: orderId,
                            product_id,
                            quantity,
                            price,
                        };
                    });                    // Fonction pour vérifier si une chaîne est un UUID valide
                    const isValidUUID = (str: string) => {
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                        return uuidRegex.test(str);
                    };

                    // Filtrer en excluant tout item où product_id est null, undefined ou n'est pas un UUID valide
                    const validOrderProducts = orderProducts.filter(item =>
                        item.product_id != null &&
                        typeof item.product_id === 'string' &&
                        isValidUUID(item.product_id)
                    );

                    console.log('Produits valides à insérer:', validOrderProducts.length);

                    if (validOrderProducts.length === 0) {
                        console.warn("Aucun line item valide (avec product_id) n'a été trouvé. Aucune insertion dans order_products.");
                    } else {
                        console.log('Insertion des produits:', validOrderProducts);
                        const { error: orderProductsError } = await supabase
                            .from('order_products')
                            .insert(validOrderProducts);

                        if (orderProductsError) {
                            console.error('Erreur lors de l\'insertion dans order_products:', orderProductsError);
                            throw createError({ statusCode: 500, statusMessage: orderProductsError.message });
                        }
                        console.log('Line items insérés avec succès dans order_products.');

                        // Déclencher l'Edge Function pour générer les tickets
                        console.log('Déclenchement de generate-tickets pour order:', orderId);
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

                            // Récupérer le token de personnalisation depuis la table tickets
                            const { data: tokenData, error: tokenError } = await supabase
                                .from('tickets')
                                .select('customization_token')
                                .eq('order_id', orderId)
                                .limit(1)
                                .single();

                            if (tokenError || !tokenData) {
                                console.warn('Impossible de récupérer le token de personnalisation pour la commande', orderId);
                            } else {
                                const customizationToken = tokenData.customization_token;
                                const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
                                const customizationLink = `${baseUrl}/customize-tickets?order_id=${orderId}&token=${customizationToken}`;                                // Envoyer l'email récapitulatif à l'acheteur
                                if (buyer_email) {
                                    try {
                                        await sendOrderSummaryEmail(buyer_email, orderId, customizationLink, [], entity_type || undefined, entity_id || undefined);
                                        console.log('Email récapitulatif envoyé à', buyer_email);
                                    } catch (emailError) {
                                        console.error('Erreur lors de l\'envoi de l\'email récapitulatif:', emailError);
                                    }
                                } else {
                                    console.warn('Email de l\'acheteur manquant, impossible d\'envoyer l\'email récapitulatif');
                                }
                            }
                        }
                    }
                } catch (lineItemError: any) {
                    console.error('Erreur lors de la récupération des line items Stripe:', lineItemError);
                    throw createError({ statusCode: 500, statusMessage: lineItemError.message });
                }
            } catch (sessionError: any) {
                console.error('Erreur lors du traitement de checkout.session.completed:', sessionError);
                throw createError({ statusCode: 500, statusMessage: sessionError.message });
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
