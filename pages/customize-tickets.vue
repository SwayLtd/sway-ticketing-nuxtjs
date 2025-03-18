<template>
    <div class="customize-container">
        <h1>Customize Your Tickets</h1>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <div v-if="loading">
            <p>Loading tickets...</p>
        </div>
        <div v-else>
            <div v-for="ticket in tickets" :key="ticket.id" class="ticket-card">
                <div class="ticket-header" @click="toggleForm(ticket)">
                    <h2>
                        {{ ticket.products?.name || 'Unknown Product' }}
                        <span v-if="ticket.displayNumber"> ({{ ticket.displayNumber }})</span>
                    </h2>
                    <button class="toggle-button">
                        {{ ticket.showForm ? '▲' : '▼' }}
                    </button>
                </div>
                <div v-if="ticket.showForm" class="ticket-form">
                    <form @submit.prevent="updateTicket(ticket)">
                        <div class="form-group">
                            <label for="firstName">First Name:</label>
                            <input v-model="customizationInputs[ticket.id].firstName" id="firstName" type="text"
                                :disabled="ticket.customization_data !== null"
                                :class="{ disabled: ticket.customization_data !== null }" required />
                        </div>
                        <div class="form-group">
                            <label for="lastName">Last Name:</label>
                            <input v-model="customizationInputs[ticket.id].lastName" id="lastName" type="text"
                                :disabled="ticket.customization_data !== null"
                                :class="{ disabled: ticket.customization_data !== null }" required />
                        </div>
                        <div class="form-group">
                            <label for="email">Email:</label>
                            <input v-model="customizationInputs[ticket.id].email" id="email" type="email"
                                :disabled="ticket.customization_data !== null"
                                :class="{ disabled: ticket.customization_data !== null }" required />
                        </div>
                        <button v-if="ticket.customization_data === null" type="submit">
                            Save Customization
                        </button>
                    </form>
                </div>
            </div>
            <p v-if="successMessage" class="success">{{ successMessage }}</p>
        </div>
        <button class="back-button" @click="goBack">Back to Home</button>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient } from '#imports'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

// Retrieve parameters from URL
const orderId = route.query.order_id as string
const token = route.query.token as string

const errorMessage = ref<string | null>(null)
const loading = ref(true)
const successMessage = ref<string | null>(null)
const tickets = ref<any[]>([])

// Reactive object for customization inputs, keyed by ticket.id
const customizationInputs = reactive<{ [key: string]: { firstName: string; lastName: string; email: string } }>({})

if (!orderId || !token) {
    errorMessage.value = "Missing order_id or token in URL."
}

async function fetchTickets() {
    if (!orderId || !token) return

    // Retrieve tickets for the order with matching customization_token,
    // including the associated product data (to get its name)
    const { data, error } = await supabase
        .from("tickets")
        .select("*, products ( name )")
        .eq("order_id", orderId)
        .eq("customization_token", token)

    if (error) {
        errorMessage.value = error.message
    } else {
        if (!data || data.length === 0) {
            errorMessage.value = "No tickets found or invalid token."
        } else {
            tickets.value = data

            // Compute frequency per product_id to assign sequential numbers only if needed
            const frequency: { [key: string]: number } = {}
            tickets.value.forEach((ticket: any) => {
                const prodId = ticket.product_id
                frequency[prodId] = (frequency[prodId] || 0) + 1
            })

            const counters: { [key: string]: number } = {}
            tickets.value.forEach((ticket: any) => {
                const prodId = ticket.product_id
                if (frequency[prodId] > 1) {
                    counters[prodId] = (counters[prodId] || 0) + 1
                    ticket.displayNumber = counters[prodId]
                } else {
                    ticket.displayNumber = ""
                }
                // Initialize customization inputs; pre-fill if customization_data exists
                if (!customizationInputs[ticket.id]) {
                    customizationInputs[ticket.id] = {
                        firstName: ticket.customization_data?.firstName || "",
                        lastName: ticket.customization_data?.lastName || "",
                        email: ticket.customization_data?.email || ""
                    }
                }
                // Initialize dropdown state
                ticket.showForm = false
            })
        }
    }
    loading.value = false
}

onMounted(() => {
    fetchTickets()
})

function toggleForm(ticket: any) {
    ticket.showForm = !ticket.showForm
}

async function updateTicket(ticket: any) {
    // Prepare customization data
    const customizationData = {
        firstName: customizationInputs[ticket.id].firstName,
        lastName: customizationInputs[ticket.id].lastName,
        email: customizationInputs[ticket.id].email,
    }

    // Update ticket's customization_data without modifying customization_token
    const { error } = await supabase
        .from("tickets")
        .update({ customization_data: customizationData })
        .eq("id", ticket.id)

    if (error) {
        alert("Error updating ticket: " + error.message)
    } else {
        successMessage.value = `Ticket updated successfully.`
        // Update the local ticket object to reflect that it's now customized
        ticket.customization_data = customizationData
    }
}

function goBack() {
    router.push('/')
}
</script>

<style scoped>
.customize-container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 1.5rem;
    font-family: sans-serif;
    background-color: #f1f1f1;
    border-radius: 8px;
    text-align: center;
}

.error {
    color: red;
    margin: 1rem 0;
}

.success {
    color: green;
    margin: 1rem 0;
}

.ticket-card {
    background-color: #fff;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    text-align: left;
}

.ticket-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
}

.ticket-header h2 {
    margin: 0;
    font-size: 1.2rem;
}

.toggle-button {
    background: none;
    border: none;
    color: #6772e5;
    font-size: 1.2rem;
    cursor: pointer;
}

.ticket-form {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #ddd;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
}

.form-group input {
    width: 100%;
    padding: 0.5rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

input.disabled {
    background-color: #e0e0e0;
    cursor: not-allowed;
}

button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    background-color: #6772e5;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    margin-top: 1rem;
}

button:hover {
    background-color: #5469d4;
}

.back-button {
    background-color: #4caf50;
}

.back-button:hover {
    background-color: #43a047;
}
</style>