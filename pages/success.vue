<template>
  <div class="success-container">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="success-icon">
        <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" />
      </svg>
    </div>
    <h1>Payment Successful!</h1>
    <p>Your order has been successfully recorded.</p>

    <!-- Order Summary (retrieved using provider_order_id) -->
    <div v-if="orderLoaded" class="order-summary">
      <h2>Your Order Summary</h2>
      <table class="order-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in orderItems" :key="item.id">
            <td>{{ item.name }}</td>
            <td class="text-center">{{ item.quantity }}</td>
            <td class="text-right">€{{ item.price.toFixed(2) }}</td>
            <td class="text-right">€{{ (item.quantity * item.price).toFixed(2) }}</td>
          </tr>
          <tr v-if="ticketFees !== null" class="ticket-fees-row">
            <td colspan="3" class="text-right">Ticket Fees</td>
            <td class="text-right">€{{ ticketFees }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="text-right order-total-label"><strong>Total</strong></td>
            <td class="text-right order-total-value"><strong>€{{ orderTotal }}</strong></td>
          </tr>
        </tfoot>
      </table>
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
      const data: any = await $fetch(`/api/order-summary?provider_order_id=${providerOrderId}`);

      orderItems.value = data.items || [];
      // Calculate grand total: products total + fees
      const productsTotal = Number(data.total) || 0;
      const fees = Number(data.ticketFees) || 0;
      orderTotal.value = (productsTotal + fees).toFixed(2);
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
  max-width: 700px;
  margin: 3rem auto;
  padding: 2rem;
  text-align: center;
  font-family: 'Inter', sans-serif; /* Modern sans-serif font */
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
}

.icon-container {
  margin-bottom: 1rem;
}

.success-icon {
  width: 80px;
  height: 80px;
  color: #4CAF50; /* Green for success */
}

.success-container h1 {
  color: #2c3e50; /* Darker, more professional text color */
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.success-container p {
  font-size: 1.1rem;
  color: #555;
  line-height: 1.6;
}

.order-summary {
  margin: 2rem 0;
  text-align: left;
  padding: 1.5rem;
  background-color: #f9fafb; /* Lighter background for summary */
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.order-summary h2 {
  margin-top: 0;
  font-size: 1.5rem;
  color: #1f2937; /* Darker heading for summary */
  margin-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.order-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.order-table th,
.order-table td {
  padding: 12px 15px; /* Increased padding */
  font-size: 0.95rem; /* Slightly adjusted font size */
  color: #333;
  border-bottom: 1px solid #e0e0e0; /* Lighter border */
}

.order-table th {
  background-color: #f3f4f6; /* Light grey for header */
  font-weight: 600; /* Bolder header text */
  text-align: left;
  color: #374151;
}

.order-table td.text-center {
  text-align: center;
}

.order-table td.text-right {
  text-align: right;
}

.order-table tbody tr:last-child td {
  border-bottom: none;
}

.ticket-fees-row td {
  font-style: italic;
  color: #555;
}

.order-table tfoot td {
  padding-top: 1rem;
  border-top: 2px solid #d1d5db; /* Stronger border for footer */
  font-weight: bold;
}

.order-total-label {
  font-size: 1.1rem;
  color: #1f2937;
}

.order-total-value {
  font-size: 1.2rem;
  color: #FEBF1E; /* Sway brand color for total */
}


.customize-section {
  margin: 2rem 0;
}

.customize-button {
  display: inline-block;
  padding: 0.85rem 1.8rem;
  background-color: #FEBF1E; /* Sway brand color */
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 1.05rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.customize-button:hover {
  background-color: #eaa900; /* Darker shade of Sway brand color */
  transform: translateY(-1px);
}

.customize-button:active {
  transform: translateY(0px);
}

.back-home {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.6rem 1.2rem;
  background-color: #555; /* Neutral dark grey */
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: background-color 0.2s ease-in-out;
}

.back-home:hover {
  background-color: #333; /* Darker grey on hover */
}
</style>
