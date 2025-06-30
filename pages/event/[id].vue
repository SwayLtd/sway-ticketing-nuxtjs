<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useSupabaseUser, useSupabaseClient } from '#imports' // Auto-importés par @nuxtjs/supabase

// --- Deep-link mobile redirection (comme sur les pages entités) ---
const isMobile = ref(false)
const entityType = 'event'

// Paramètres globaux (à centraliser si besoin)
const stripeCommissionRate = 0.0;  // Exemple : 1,5% (0 pour désactiver)
const stripeFixedFee = 0.00;         // Exemple : 0,25 €
const swayCommissionRate = 0.035;    // 3,5%
const swayFixedFee = 0.50;           // 0,50 €

// Variables d'environnement
const { public: { BASE_URL } } = useRuntimeConfig()
const supabase = useSupabaseClient()


const route = useRoute()
const router = useRouter()
const eventId = Number(route.params.id)

onMounted(() => {
    isMobile.value = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    // Redirection deep-link mobile si l'URL contient un ID d'event
    if (eventId && isMobile.value) {
        window.location.href = `app.sway.main://app/${entityType}/${eventId}`
    }
})

// Gestion de l'utilisateur avec useSupabaseUser
const user = useSupabaseUser()
const isLoggedIn = computed(() => !!user.value)

// Récupération du username depuis la table "users"
const username = ref('')
onMounted(async () => {
    if (user.value && user.value.id) {
        const { data, error } = await supabase
            .from('users')
            .select('username')
            .eq('supabase_id', user.value.id)
            .single<{ username: string }>()
        if (error) {
            console.error('Erreur lors de la récupération du username:', error)
        } else if (data) {
            username.value = data.username || ''
        }
    }
})

// Affichage : on affiche le username (s'il est chargé) sinon rien ne s'affiche
const isUserLoaded = computed(() => {
    return isLoggedIn.value ? username.value !== '' : true
})
const userDisplay = computed(() => {
    return username.value || user.value?.email || ''
})

// Récupération de l'événement
const eventInfo = ref<any>(null)
async function fetchEvent() {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
    if (error) throw error
    eventInfo.value = data
}
await fetchEvent()

// Récupération des produits (tickets) liés à l'événement
const productsData = ref<any[]>([])
async function fetchProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('entity_type', 'event')
        .eq('entity_id', eventId)
    if (error) throw error
    productsData.value = data || []
}
await fetchProducts()

// Tri des produits par prix
const sortedProducts = computed(() => {
    return [...productsData.value].sort((a, b) => Number(a.price) - Number(b.price))
})

// Initialisation des quantités pour chaque produit
const initialQuantities: Record<string, number> = {}
sortedProducts.value.forEach((product: any) => {
    initialQuantities[product.id] = 0
})
const quantities = ref({ ...initialQuantities })

// Fonction pour mettre à jour la quantité d'un produit en respectant max_per_order
const updateQuantity = (productId: string, delta: number) => {
    const current = quantities.value[productId] || 0
    // Récupérer le produit correspondant
    const product = sortedProducts.value.find((p: any) => p.id === productId)
    let newQuantity = current + delta
    // Si max_per_order est défini et que le nouveau total dépasse la limite, le plafonner
    if (product && product.max_per_order !== null && product.max_per_order !== undefined) {
        if (newQuantity > product.max_per_order) {
            newQuantity = product.max_per_order
        }
    }
    quantities.value[productId] = Math.max(newQuantity, 0)
}

// Liste des produits sélectionnés (quantité > 0)
const selectedProducts = computed(() => {
    return sortedProducts.value.filter((p: any) => (quantities.value[p.id] || 0) > 0)
})

// Calculs (en euros)
// Total des tickets (T)
const totalOrder = computed(() => {
    return sortedProducts.value.reduce((acc: number, p: any) => {
        const price = Number(p.price) || 0;
        const qty = quantities.value[p.id] || 0;
        return acc + qty * price;
    }, 0)
})

// Commission Sway annoncée (C) = T × swayCommissionRate + swayFixedFee
const commission = computed(() => {
    return totalOrder.value * swayCommissionRate + swayFixedFee;
})

// Calcul des frais Stripe sur la commission (S) = (C × stripeCommissionRate) + stripeFixedFee
const stripeFee = computed(() => {
    return commission.value * stripeCommissionRate + stripeFixedFee;
})

// La commission nette pour Sway (ce que vous percevrez) = Commission Sway - Stripe Fee
const netCommission = computed(() => {
    return commission.value - stripeFee.value;
})

// Grand total facturé au client (A) = T + C
const grandTotal = computed(() => {
    return totalOrder.value + commission.value;
})

// Conversion en centimes
const stripeFeeCents = computed(() => Math.round(stripeFee.value * 100));
const netCommissionCents = computed(() => Math.round(netCommission.value * 100));

// Formatage de la date
const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'EEEE dd MMM yyyy, HH:mm')
}

// Gestion de l'email pour les utilisateurs non connectés
const email = ref('')
const emailError = ref('')

// Fonction de réservation (handleBook)
const handleBook = async () => {
    // Si l'utilisateur n'est pas connecté, vérifier que le champ email est rempli
    if (!isLoggedIn.value && !email.value) {
        emailError.value = "L'adresse email est obligatoire pour réserver."
        return;
    } else {
        emailError.value = "";
    }

    // Préparer les articles pour les tickets en incluant l'identifiant interne du produit
    const ticketLineItems = sortedProducts.value
        .filter((p: any) => (quantities.value[p.id] || 0) > 0)
        .map((p: any) => ({
            name: p.name,
            amount: Math.round(Number(p.price) * 100), // conversion en centimes
            quantity: quantities.value[p.id],
            product_id: p.id // identifiant interne du produit
        }));

    // Construire le tableau des articles à envoyer
    const lineItems = [...ticketLineItems];

    // Si les frais Stripe (calculés) sont supérieurs à 0, on ajoute la ligne "Stripe Fees"
    if (stripeFeeCents.value > 0) {
        lineItems.push({
            name: "Stripe Fees",
            amount: stripeFeeCents.value, // en centimes
            quantity: 1,
            product_id: "stripe_fees" // or a suitable identifier for fees
        });
    }

    // Toujours ajouter la ligne pour les frais Sway nets (commission nette)
    lineItems.push({
        name: "Fees",
        amount: netCommissionCents.value, // en centimes
        quantity: 1,
        product_id: "sway_fees" // or another suitable identifier for Sway fees
    });

    // Détermination de l'email à utiliser (celui de la session ou celui saisi)
    const buyerEmail = isLoggedIn.value ? user.value?.email ?? '' : email.value;
    const userId = isLoggedIn.value ? user.value?.id : null;

    try {
        const response = await $fetch('/api/create-checkout-session', {
            method: 'POST',
            body: {
                eventId,
                lineItems,
                promoterStripeAccountId: eventInfo.value.promoter_stripe_account_id,
                currency: sortedProducts.value[0]?.currency || 'EUR',
                feeAmount: netCommissionCents.value, // en centimes
                buyerEmail,
                userId,
            },
        });
        console.log("Checkout Session Response:", response);
        if (response.url) {
            window.location.href = response.url;
        }
    } catch (err) {
        console.error('Erreur lors de la création de la commande Stripe:', err);
    }
}

// Fonction pour rediriger vers la page de login
const goToLogin = () => {
    router.push('/login')
}

// --- Gestion metadata event (comme dans settings.vue) ---
const eventMetadata = computed(() => {
    const data = eventInfo.value
    if (!data) return { sway_tickets: false }
    let loadedMeta = {}
    if (typeof data.metadata === 'string') {
        try {
            loadedMeta = JSON.parse(data.metadata)
        } catch (e) {
            loadedMeta = {}
        }
    } else if (typeof data.metadata === 'object' && data.metadata !== null) {
        loadedMeta = data.metadata
    } else {
        loadedMeta = {}
    }
    // Valeurs par défaut
    return { timetable: false, ticket_link: '', sway_tickets: false, ...loadedMeta }
})
</script>

<template>
    <main class="container">
        <!-- Indicateur de session Supabase -->
        <div class="sessionIndicator">
            <template v-if="isLoggedIn">
                <template v-if="isUserLoaded">
                    <span class="userDisplay">{{ userDisplay }}</span>
                </template>
            </template>
            <template v-else>
                <button class="loginButton" @click="goToLogin">Sign in</button>
            </template>
        </div>

        <!-- En-tête de l'événement -->
        <div v-if="eventInfo" class="eventHeader">
            <div v-if="eventInfo.image_url" class="eventImage">
                <img :src="eventInfo.image_url" :alt="eventInfo.title">
            </div>
            <div class="eventInfo">
                <h1>{{ eventInfo.title }}</h1>
                <p>
                    {{ formatDate(eventInfo.date_time) }}
                    <span v-if="eventInfo.end_date_time">
                        - {{ formatDate(eventInfo.end_date_time) }}
                    </span>
                </p>
            </div>
        </div>

        <!-- Section Tickets et Order Summary -->
        <section class="ticketSection">
            <div v-if="eventMetadata.sway_tickets" class="ticketAndSummary">
                <!-- Liste des tickets -->
                <div class="ticketsList">
                    <h2>Tickets</h2>
                    <div v-if="sortedProducts.length === 0">
                        <p>No tickets available.</p>
                    </div>
                    <div v-else>
                        <div v-for="p in sortedProducts" :key="p.id" class="ticketRow">
                            <div class="ticketDetails">
                                <span class="ticketName">{{ p.name }}</span>
                                <span v-if="p.description" class="ticketDescription">{{ p.description }}</span>
                                <span class="ticketPrice">{{ p.price }} {{ p.currency }}</span>
                            </div>
                            <div class="quantityRow">
                                <button type="button" class="counterButton" @click="updateQuantity(p.id, -1)">–</button>
                                <span class="quantityValue">{{ quantities[p.id] }}</span>
                                <!-- Désactiver le bouton plus si la limite est atteinte -->
                                <button type="button" class="counterButton"
                                    :disabled="p.max_per_order !== null && p.max_per_order !== undefined && quantities[p.id] >= p.max_per_order"
                                    @click="updateQuantity(p.id, 1)">
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Order Summary (affiché si des tickets sont ajoutés) -->
                <div v-if="selectedProducts.length > 0" class="orderSummary">
                    <h2>Order Summary</h2>
                    <div v-for="p in selectedProducts" :key="p.id" class="summaryRow">
                        <span>{{ p.name }} x {{ quantities[p.id] }}</span>
                        <span>{{ (quantities[p.id] * p.price).toFixed(2) }} {{ p.currency }}</span>
                    </div>
                    <div class="summaryRow">
                        <span>Fees</span>
                        <span>{{ commission.toFixed(2) }} {{ sortedProducts[0]?.currency || "" }}</span>
                    </div>
                    <div class="summaryTotal">
                        <strong>Total</strong>
                        <strong>{{ grandTotal.toFixed(2) }} {{ sortedProducts[0]?.currency || "" }}</strong>
                    </div>

                    <!-- Champ email si non connecté -->
                    <div v-if="!isLoggedIn" class="emailInput">
                        <input id="email" v-model="email" type="email" placeholder="example@mail.com">
                        <p v-if="emailError" class="error">{{ emailError }}</p>
                    </div>

                    <button type="button" class="bookButton" @click="handleBook">BOOK</button>
                </div>
            </div>
            <div v-else class="ticketsList">
                <h2>Tickets</h2>
                <div class="alert alert-warning bg-yellow-100 text-yellow-800 p-4 rounded">
                    Cet événement n'utilise pas la billetterie Sway Tickets.
                </div>
            </div>
        </section>
    </main>
</template>

<style scoped>
:global(html, body) {
    margin: 0;
    padding: 0;
    background-color: rgb(15, 13, 8);
}

.container {
    background-color: rgb(15, 13, 8);
    color: #fff;
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px;
    box-sizing: border-box;
    font-family: "Space Grotesk", sans-serif;
}

/* Indicateur de session */
.sessionIndicator {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    font-size: 0.9rem;
    margin-bottom: 10px;
}

.userDisplay {
    padding: 6px 12px;
    background-color: #FFBC00;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: default;
}

/* Bouton login (identique au style du badge userDisplay) */
.loginButton {
    padding: 6px 12px;
    background-color: #FFBC00;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.loginButton:hover {
    background-color: #b38402;
}

/* En-tête de l'événement */
.eventHeader {
    display: flex;
    flex-direction: row;
    gap: 20px;
    margin-bottom: 20px;
    flex-shrink: 0;
}

.eventImage {
    position: relative;
    width: 100%;
    max-width: 600px;
    aspect-ratio: 16 / 9;
    border: 2px solid #ccc;
    border-radius: 12px;
    overflow: hidden;
}

.eventImage img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.eventInfo {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    font-size: 1rem;
}

.eventInfo h1 {
    margin: 0;
    font-size: 2rem;
}

.eventInfo p {
    margin: 0;
    font-size: 1.2rem;
    color: #ccc;
}

/* Tickets et Order Summary */
.ticketSection {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
}

.ticketAndSummary {
    display: flex;
    flex-direction: row;
    gap: 16px;
    width: 100%;
    overflow: hidden;
}

.ticketsList {
    width: 60%;
    background-color: #1e1e1e;
    padding: 16px;
    border-radius: 8px;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.ticketsList h2 {
    margin: 0 0 10px 16px;
    font-size: 1.25rem;
}

.ticketRow {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background-color: #2a2a2a;
    border-radius: 4px;
    gap: 5px;
}

.ticketDetails {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.ticketName {
    font-size: 0.9rem;
    font-weight: 500;
}

.ticketDescription {
    font-size: 0.8rem;
    color: #888;
}

.ticketPrice {
    font-size: 0.8rem;
    color: #aaa;
}

.max-per-order {
    font-size: 0.8rem;
    color: #FFBC00;
}

.quantityRow {
    display: flex;
    align-items: center;
    gap: 5px;
}

.counterButton {
    background-color: #ffbc00;
    border: none;
    color: #fff;
    font-size: 1rem;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.counterButton:disabled {
    background-color: #777;
    cursor: not-allowed;
}

.counterButton:hover:not(:disabled) {
    background-color: #e0a700;
}

.quantityValue {
    font-size: 0.9rem;
    min-width: 20px;
    text-align: center;
}

/* Order Summary */
.orderSummary {
    width: 30%;
    background-color: #1e1e1e;
    padding: 16px;
    border-radius: 8px;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.orderSummary h2 {
    margin: 0 0 10px 16px;
    font-size: 1.25rem;
}

.summaryRow {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    border-bottom: 1px solid #333;
    padding: 2px 0;
    gap: 5px;
}

.summaryTotal {
    display: flex;
    justify-content: space-between;
    font-size: 1rem;
    margin-top: 10px;
    padding-top: 5px;
    border-top: 1px solid #333;
    gap: 5px;
}

.bookButton {
    background-color: rgb(15, 13, 8);
    color: #fff;
    border: 2px solid #fff;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: bold;
    padding: 10px;
    cursor: pointer;
    width: 100%;
    min-height: 50px;
    transition: background-color 0.3s ease;
    margin-top: 16px;
    text-transform: uppercase;
}

.bookButton:hover {
    background-color: #444;
}

.emailInput {
    margin-bottom: 10px;
}

.emailInput label {
    display: block;
    margin-bottom: 4px;
}

.emailInput input {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: none;
}

.error {
    color: red;
    font-size: 0.8rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .ticketAndSummary {
        flex-direction: column;
    }

    .ticketsList,
    .orderSummary {
        width: 100%;
        box-sizing: border-box;
    }

    .eventHeader {
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }

    .eventInfo {
        text-align: left;
    }
}
</style>
