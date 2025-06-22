<template>
    <ClientOnly>
        <div class="customize-container">
            <h1 class="page-title">Customize Your Tickets</h1>
            <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
            <div v-if="loading">
                <p>Loading tickets...</p>
            </div>
            <div v-else>
                <div v-for="ticket in tickets" :key="ticket.id" class="ticket-card">
                    <div class="ticket-header" @click="toggleForm(ticket)">
                        <h2>
                            {{ ticket.products?.name || 'Unknown Product' }}
                            <span v-if="ticket.displayNumber" class="ticket-number-badge"> ({{ ticket.displayNumber }})</span>
                        </h2>
                        <button class="toggle-button">
                            <svg v-if="ticket.showForm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="toggle-icon">
                                <path fill-rule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.938a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clip-rule="evenodd" />
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="toggle-icon">
                                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <div v-if="ticket.showForm" class="ticket-form">
                        <form @submit.prevent="updateTicket(ticket)">
                            <div class="form-group">
                                <label for="firstName">First Name:</label>
                                <input
id="firstName" v-model="customizationInputs[ticket.id].firstName" type="text"
                                    :disabled="ticket.customization_data !== null"
                                    :class="{ disabled: ticket.customization_data !== null }" required >
                            </div>
                            <div class="form-group">
                                <label for="lastName">Last Name:</label>
                                <input
id="lastName" v-model="customizationInputs[ticket.id].lastName" type="text"
                                    :disabled="ticket.customization_data !== null"
                                    :class="{ disabled: ticket.customization_data !== null }" required >
                            </div>
                            <div class="form-group">
                                <label for="email">Email:</label>
                                <input
id="email" v-model="customizationInputs[ticket.id].email" type="email"
                                    :disabled="ticket.customization_data !== null"
                                    :class="{ disabled: ticket.customization_data !== null }" required >
                            </div>
                            <button v-if="ticket.customization_data === null" type="submit" class="action-button save-button">
                                Save Customization
                            </button>
                        </form>
                        <div v-if="ticket.customization_data !== null" class="actions-group">
                            <button class="action-button download-button" @click="downloadTicket(ticket)">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="button-icon">
                                    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                                </svg>
                                Download My Ticket
                            </button>
                            <button class="action-button resend-email-button" @click="resendTicketEmail(ticket)">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="button-icon">
                                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                                </svg>
                                Resend Ticket Email
                            </button>
                        </div>
                    </div>
                </div>
                <p v-if="successMessage" class="success">{{ successMessage }}</p>
            </div>
            <button class="action-button back-button" @click="goBack">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="button-icon">
                    <path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l2.72 2.72a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 111.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd" />
                </svg>
                Back to Home
            </button>
        </div>
        <template #fallback>
            <div class="customize-container">
                <h1>Customize Your Tickets</h1>
                <p>Loading...</p>
            </div>
        </template>
    </ClientOnly>
</template>

<script setup lang="ts">
// Désactiver SSR pour cette page pour éviter les problèmes avec jsPDF
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient } from '#imports'

definePageMeta({
    ssr: false
})

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

    try {
        // Utiliser l'API au lieu d'accéder directement à Supabase
        const response = await $fetch<{success: boolean, tickets: any[]}>('/api/tickets/customize', {
            method: 'GET',
            query: {
                order_id: orderId,
                token: token
            }
        })

        if (response.success && response.tickets) {
            tickets.value = response.tickets

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
                    }                }
                // Initialize dropdown state
                ticket.showForm = false
            })
        } else {
            errorMessage.value = "No tickets found or invalid token."
        }
    } catch (error: any) {
        console.error('Error fetching tickets:', error)
        errorMessage.value = error.data?.message || error.message || "Error loading tickets."
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

    try {
        // Update ticket's customization_data using API
        const response = await $fetch<{success: boolean, ticket: any}>('/api/tickets/update-customization', {
            method: 'POST',
            body: {
                ticket_id: ticket.id,
                order_id: orderId,
                token: token,
                customization_data: customizationData
            }
        })

        if (response.success) {
            // Update the local ticket object to reflect that it's now customized
            ticket.customization_data = customizationData

            // Automatically send personalized ticket email
            try {
                const emailResponse = await $fetch('/api/ticket-personalization-email', {
                    method: 'POST',
                    body: { ticket_id: ticket.id }
                });

                successMessage.value = `Ticket updated successfully and personalized ticket email sent!`;
            } catch (emailError: any) {
                console.error('Error sending personalized ticket email:', emailError);
                successMessage.value = `Ticket updated successfully, but failed to send email notification.`;
            }
        }
    } catch (error: any) {
        console.error('Error updating ticket:', error)
        errorMessage.value = error.data?.message || error.message || "Error updating ticket."
    }
}

function goBack() {
    router.push('/')
}

// New function to generate and download PDF ticket with stylized design
async function downloadTicket(ticket: any) {
    try {
        // Call the new API endpoint for stylized ticket download
        const response = await fetch('/api/download-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticket_id: ticket.id })
        });

        if (!response.ok) {
            throw new Error('Failed to generate ticket PDF');
        }

        // Get the PDF blob
        const pdfBlob = await response.blob();

        // Create download link
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `ticket_${ticket.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

    } catch (error) {
        console.error('Error downloading ticket:', error);
        alert('Error downloading ticket. Please try again.');
    }
}

// New function to resend ticket personalization email
async function resendTicketEmail(ticket: any) {
    try {
        const response = await $fetch('/api/ticket-personalization-email', {
            method: 'POST',
            body: { ticket_id: ticket.id }
        });
        
        successMessage.value = 'Personalized ticket email resent successfully.';
    } catch (error: any) {
        console.error('Error resending email:', error);
        errorMessage.value = error.data?.message || error.message || 'Error resending email.';
    }
}
</script>

<style scoped>
.customize-container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem; /* Increased padding */
    font-family: 'Inter', sans-serif; /* Modern sans-serif font */
    background-color: #f9fafb; /* Lighter background */
    border-radius: 12px; /* More rounded corners */
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05); /* Softer shadow */
    border: 1px solid #e5e7eb; /* Lighter border */
}

.page-title {
    color: #1f2937; /* Darker heading */
    font-size: 2.25rem; /* Larger title */
    font-weight: 700; /* Bolder title */
    margin-bottom: 2rem; /* More space below title */
    text-align: center;
}

.error {
    color: #ef4444; /* Tailwind red-500 */
    background-color: #fee2e2; /* Tailwind red-100 */
    border: 1px solid #fca5a5; /* Tailwind red-300 */
    padding: 1rem;
    border-radius: 6px;
    margin: 1.5rem 0;
    text-align: center;
}

.success {
    color: #10b981; /* Tailwind green-500 */
    background-color: #d1fae5; /* Tailwind green-100 */
    border: 1px solid #6ee7b7; /* Tailwind green-300 */
    padding: 1rem;
    border-radius: 6px;
    margin: 1.5rem 0;
    text-align: center;
}

.ticket-card {
    background-color: #ffffff;
    padding: 1.5rem; /* Increased padding */
    margin-bottom: 1.5rem; /* Increased margin */
    border-radius: 8px; /* More rounded corners */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* Slightly more pronounced shadow */
    border: 1px solid #e0e0e0;
    transition: box-shadow 0.3s ease;
}

.ticket-card:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.ticket-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding-bottom: 0.5rem; /* Add some padding if form is hidden */
}

.ticket-header h2 {
    margin: 0;
    font-size: 1.4rem; /* Larger ticket name */
    font-weight: 600;
    color: #374151; /* Dark grey for ticket name */
}

.ticket-number-badge {
    font-size: 0.9rem;
    font-weight: 500;
    color: #6b7280; /* Medium grey for badge */
    background-color: #f3f4f6; /* Light grey background for badge */
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    margin-left: 0.5rem;
}

.toggle-button {
    background: none;
    border: none;
    color: #FEBF1E; /* Sway brand color */
    cursor: pointer;
    padding: 0.5rem; /* Add padding for easier clicking */
}

.toggle-icon {
    width: 24px; /* Larger icon */
    height: 24px;
}

.ticket-form {
    margin-top: 1rem; /* More space above form */
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb; /* Lighter border */
}

.form-group {
    margin-bottom: 1.25rem; /* Increased margin */
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500; /* Medium weight for labels */
    color: #374151; /* Dark grey for labels */
}

.form-group input {
    width: 100%;
    padding: 0.75rem 1rem; /* Increased padding */
    font-size: 1rem;
    border: 1px solid #d1d5db; /* Medium grey border */
    border-radius: 6px; /* More rounded corners */
    box-sizing: border-box; /* Ensure padding doesn't affect width */
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group input:focus {
    outline: none;
    border-color: #FEBF1E; /* Sway brand color on focus */
    box-shadow: 0 0 0 3px rgba(254, 191, 30, 0.3); /* Focus ring with Sway color */
}

input.disabled {
    background-color: #f3f4f6; /* Lighter disabled background */
    color: #9ca3af; /* Lighter text for disabled */
    cursor: not-allowed;
}

.actions-group {
    display: flex;
    gap: 1rem; /* Space between buttons */
    margin-top: 1.5rem;
    flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
}

.action-button {
    display: inline-flex; /* For aligning icon and text */
    align-items: center;
    gap: 0.5rem; /* Space between icon and text */
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out, transform 0.1s ease;
    flex-grow: 1; /* Allow buttons to grow and fill space if needed */
}

.action-button:hover {
    transform: translateY(-1px);
}
.action-button:active{
    transform: translateY(0px);
}

.button-icon {
    width: 20px;
    height: 20px;
}

.save-button {
    background-color: #FEBF1E; /* Sway brand color */
    color: #fff;
    width: 100%; /* Make save button full width */
    justify-content: center; /* Center text in full-width button */
}

.save-button:hover {
    background-color: #eaa900; /* Darker Sway brand color */
}

.download-button {
    background-color: #3b82f6; /* Tailwind blue-500 */
    color: #fff;
}

.download-button:hover {
    background-color: #2563eb; /* Darker blue */
}

.resend-email-button {
    background-color: #10b981; /* Tailwind green-500 */
    color: #fff;
}

.resend-email-button:hover {
    background-color: #059669; /* Darker green */
}

.back-button {
    background-color: #6b7280; /* Tailwind gray-500 */
    color: #fff;
    margin-top: 2rem; /* More space above back button */
    width: auto; /* Auto width for back button */
    min-width: 150px;
    justify-content: center;
}

.back-button:hover {
    background-color: #4b5563; /* Darker gray */
}

/* Responsive adjustments */
@media (max-width: 600px) {
    .customize-container {
        padding: 1rem;
    }
    .page-title {
        font-size: 1.8rem;
    }
    .ticket-header h2 {
        font-size: 1.2rem;
    }
    .action-button {
        font-size: 0.9rem;
        padding: 0.6rem 1.2rem;
    }
    .actions-group {
        flex-direction: column; /* Stack buttons on small screens */
    }
}
</style>
