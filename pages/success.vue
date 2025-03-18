<template>
  <div class="success-container">
    <h1>Payment Successful!</h1>
    <p>Your order has been successfully recorded.</p>

    <!-- Order Summary (retrieved using provider_order_id) -->
    <div v-if="orderLoaded" class="order-summary">
      <h2>Your Order Summary</h2>
      <ul>
        <li v-for="item in orderItems" :key="item.id">
          <span class="item-name">{{ item.name }}</span> -
          <span class="item-quantity">{{ item.quantity }} x {{ item.price }} €</span>
        </li>
        <li v-if="ticketFees !== null" class="ticket-fees">
          <span class="item-name">Ticket Fees</span> -
          <span class="item-quantity">{{ ticketFees }} €</span>
        </li>
      </ul>
      <p class="order-total"><strong>Total:</strong> {{ orderTotal }} €</p>
    </div>
    <div v-else>
      <p>Loading order summary...</p>
    </div>

    <!-- Customize tickets button -->
    <div v-if="orderLoaded && orderHasTickets" class="customize-section">
      <NuxtLink :to="customizeLink" class="customize-button">
        Customize My Tickets
      </NuxtLink>
    </div>

    <NuxtLink to="/" class="back-home">Back to Home</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute();

// Retrieve query parameters:
// provider_order_id: legacy identifier from Stripe, used to fetch the order summary
// localOrderId: local order ID (if provided) but otherwise we'll retrieve it from the API response
const providerOrderId = route.query.provider_order_id as string;
let localOrderId = route.query.order_id as string | undefined;

const orderItems = ref<any[]>([]);
const orderTotal = ref('0.00');
const orderHasTickets = ref(false);
const ticketFees = ref<string | null>(null);
const orderLoaded = ref(false);
const customizationToken = ref(""); // To be retrieved from the API

async function fetchOrderSummary() {
  try {
    if (providerOrderId && typeof providerOrderId === 'string') {
      const data = await $fetch(`/api/order-summary?provider_order_id=${providerOrderId}`);
      orderItems.value = data.items || [];
      orderTotal.value = Number(data.total).toFixed(2);
      orderHasTickets.value = data.hasTickets || false;
      ticketFees.value = data.ticketFees !== undefined ? Number(data.ticketFees).toFixed(2) : null;

      // If the local order_id is not provided in the URL, get it from the response
      if (!localOrderId && data.order_id) {
        localOrderId = data.order_id;
      }
      // Retrieve the customization token from the API response
      customizationToken.value = data.customization_token || "";
    } else {
      console.error('Missing or invalid provider_order_id');
    }
  } catch (error) {
    console.error('Error fetching order summary:', error);
  } finally {
    orderLoaded.value = true;
  }
}

onMounted(() => {
  fetchOrderSummary();
});

// Build the link to the customize-tickets page using the local order_id and customization token.
const customizeLink = computed(() => {
  return `/customize-tickets?order_id=${localOrderId || ""}&token=${customizationToken.value}`;
});
</script>

<style scoped>
.success-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1.5rem;
  text-align: center;
  font-family: sans-serif;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.success-container h1 {
  color: #4caf50;
  margin-bottom: 0.5rem;
}

.success-container p {
  font-size: 1.1rem;
  color: #333;
}

.order-summary {
  margin: 1.5rem 0;
  text-align: left;
  padding: 1rem;
  background-color: #fff;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.order-summary h2 {
  margin-top: 0;
  font-size: 1.3rem;
  color: #333;
}

.order-summary ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.order-summary li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.order-summary li:last-child {
  border-bottom: none;
}

.item-name {
  font-weight: bold;
}

.item-quantity {
  color: #666;
}

.order-total {
  font-size: 1.2rem;
  text-align: right;
  margin-top: 1rem;
  font-weight: bold;
}

.ticket-fees {
  font-size: 1.1rem;
  color: #333;
}

.customize-section {
  margin: 1rem 0;
}

.customize-button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #6772e5;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.customize-button:hover {
  background-color: #5469d4;
}

.back-home {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.back-home:hover {
  background-color: #43a047;
}
</style>
