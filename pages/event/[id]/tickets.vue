<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { format } from 'date-fns'
import { createClient } from '@supabase/supabase-js'

// Paramètres globaux (à centraliser, puis éventuellement déplacer dans une config)
const stripeCommissionRate = 0.015;  // 1,5%
const stripeFixedFee = 0.25;          // 0,25 €
const swayCommissionRate = 0.035;     // 3,5%
const swayFixedFee = 0.50;            // 0,50 €

// Récupération des variables d'environnement via useRuntimeConfig()
const { public: { SUPABASE_URL, SUPABASE_ANON_KEY } } = useRuntimeConfig()
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const route = useRoute()
const eventId = Number(route.params.id)

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

// Fonction pour mettre à jour la quantité d'un produit
const updateQuantity = (productId: string, delta: number) => {
  const current = quantities.value[productId] || 0
  quantities.value[productId] = Math.max(current + delta, 0)
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

// Le total facturé au client (A) = T + C
const grandTotal = computed(() => {
  return totalOrder.value + commission.value;
})

// Pour le Checkout, nous "fake" l'affichage en envoyant deux articles de frais distincts :
// - Un article "Stripe Fees" pour montrer les frais Stripe (stripeFee)
// - Un article "Fees" pour votre commission nette (netCommission)
// On convertit ces valeurs en centimes.
const stripeFeeCents = computed(() => Math.round(stripeFee.value * 100));
const netCommissionCents = computed(() => Math.round(netCommission.value * 100));

// Formatage de la date
const formatDate = (dateStr: string) => {
  return format(new Date(dateStr), 'EEEE dd MMM yyyy, HH:mm')
}

// Fonction de réservation (handleBook)
const handleBook = async () => {
  // Préparer les articles pour les tickets
  const ticketLineItems = sortedProducts.value
    .filter((p: any) => (quantities.value[p.id] || 0) > 0)
    .map((p: any) => ({
      name: p.name,
      amount: Math.round(Number(p.price) * 100), // conversion en centimes
      quantity: quantities.value[p.id],
    }));

  // Article pour les Stripe Fees
  const stripeFeeLineItem = {
    name: "Stripe Fees",
    amount: stripeFeeCents.value, // en centimes
    quantity: 1,
  };

  // Article pour la commission nette (ce que Sway reçoit)
  const feeLineItem = {
    name: "Fees",
    amount: netCommissionCents.value, // en centimes
    quantity: 1,
  };

  // Concaténer les articles
  const lineItems = ticketLineItems.concat([stripeFeeLineItem, feeLineItem]);

  console.log("Handle Book:");
  console.log("Event ID:", eventId);
  console.log("Ticket Line Items:", ticketLineItems);
  console.log("Stripe Fee Line Item:", stripeFeeLineItem);
  console.log("Fee Line Item (net commission):", feeLineItem);
  console.log("Line Items envoyés:", lineItems);
  console.log("Total Order (T):", totalOrder.value);
  console.log("Commission Sway annoncée (C):", commission.value);
  console.log("Calculated Stripe Fee (S):", stripeFee.value);
  console.log("Net Commission (C - S):", netCommission.value);
  console.log("Grand Total (A = T + C):", grandTotal.value);
  console.log("Promoter Stripe Account ID:", eventInfo.value.promoter_stripe_account_id);

  try {
    const response = await $fetch('/api/create-checkout-session', {
      method: 'POST',
      body: {
        eventId,
        lineItems,
        promoterStripeAccountId: eventInfo.value.promoter_stripe_account_id,
        currency: sortedProducts.value[0]?.currency || 'EUR',
        // On envoie la commission nette (ce que Sway perçoit) en centimes
        feeAmount: netCommissionCents.value,
      },
    });
    console.log("Checkout Session Response:", response);
    if (response.url) {
      window.location.href = response.url;
    }
  } catch (err) {
    console.error('Erreur lors de la création de la commande Stripe:', err);
  }
};
</script>

<template>
  <main class="container">
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
      <div class="ticketAndSummary">
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
                <button type="button" class="counterButton" @click="updateQuantity(p.id, 1)">+</button>
              </div>
            </div>
          </div>
        </div>
        <!-- Order Summary (affiché si des tickets sont ajoutés) -->
        <div class="orderSummary" v-if="selectedProducts.length > 0">
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
          <button type="button" class="bookButton" @click="handleBook">BOOK</button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.container {
  background-color: rgb(15, 13, 8);
  color: #fff;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
  font-family: "Space Grotesk", sans-serif;
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
.counterButton:hover {
  background-color: #e0a700;
}
.quantityValue {
  font-size: 0.9rem;
  min-width: 20px;
  text-align: center;
}

/* Order Summary */
.orderSummary {
  width: 40%; /* Ajustez selon votre design */
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
    text-align: center;
  }
}
</style>
