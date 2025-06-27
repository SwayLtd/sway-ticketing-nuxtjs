<template>
  <div class="min-h-screen bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-1">Paramètres de l'événement</h1>
          <p class="text-sm text-gray-600">Gérez tous les paramètres de l'événement via les onglets ci-dessous.</p>
        </div>
      </div>

      <!-- Tabs daisyUI -->
      <div role="tablist" class="tabs tabs-boxed bg-base-200 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          role="tab"
          :class="['tab', activeTab === tab.key ? 'tab-active' : '', 'focus:outline-none']"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Notifications -->
      <AdminNotification
        v-if="notification.show"
        :type="notification.type"
        :message="notification.message"
        :description="notification.description"
        :duration="notification.duration"
        @close="notification.show = false"
      />

      <!-- Onglet Main -->
      <div v-if="activeTab === 'main'">
        <form class="space-y-6" @submit.prevent="saveMain">
          <div class="card bg-base-100 shadow p-4">
            <label class="block font-semibold mb-1" for="eventName">Nom de l'événement</label>
            <input
              id="eventName"
              v-model="mainForm.title"
              class="input input-bordered w-full"
              :disabled="isActionDisabled"
              :aria-disabled="isActionDisabled"
              required
            >
          </div>

          <!-- Organizers (Promoters) -->
          <div class="card bg-base-100 shadow p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold">Organisateurs</span>
              <button
                :disabled="isActionDisabled"
                :aria-disabled="isActionDisabled"
                class="btn btn-sm btn-primary"
                :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
                type="button"
                @click="openPromoterModal"
              >
                Ajouter un organisateur
              </button>
            </div>
            <div v-if="mainForm.promoters.length === 0" class="text-gray-400">Aucun organisateur lié.</div>
            <ul>
              <li v-for="prom in mainForm.promoters" :key="prom.id" class="flex items-center justify-between py-1">
                <span>{{ prom.name }}</span>
                <div class="tooltip" v-if="mainForm.promoters.length === 1" data-tip="Il doit rester au moins 1 organisateur assigné.">
                  <button
                    :disabled="true"
                    aria-disabled="true"
                    class="btn btn-xs btn-error btn-disabled opacity-50 cursor-not-allowed"
                    type="button"
                  >
                    Retirer
                  </button>
                </div>
                <button
                  v-else
                  :disabled="isActionDisabled"
                  :aria-disabled="isActionDisabled"
                  class="btn btn-xs btn-error"
                  :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
                  type="button"
                  @click="removePromoter(prom.id)"
                >
                  Retirer
                </button>
              </li>
            </ul>
          </div>

          <!-- Venues -->
          <div class="card bg-base-100 shadow p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold">Lieux</span>
              <button
                :disabled="isActionDisabled"
                :aria-disabled="isActionDisabled"
                class="btn btn-sm btn-primary"
                :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
                type="button"
                @click="openVenueModal"
              >
                Ajouter un lieu
              </button>
            </div>
            <div v-if="mainForm.venues.length === 0" class="text-gray-400">Aucun lieu lié.</div>
            <ul>
              <li v-for="venue in mainForm.venues" :key="venue.id" class="flex items-center justify-between py-1">
                <span>{{ venue.name }}</span>
                <div class="tooltip" v-if="mainForm.venues.length === 1" data-tip="Il doit rester au moins 1 lieu assigné.">
                  <button
                    :disabled="true"
                    aria-disabled="true"
                    class="btn btn-xs btn-error btn-disabled opacity-50 cursor-not-allowed"
                    type="button"
                  >
                    Retirer
                  </button>
                </div>
                <button
                  v-else
                  :disabled="isActionDisabled"
                  :aria-disabled="isActionDisabled"
                  class="btn btn-xs btn-error"
                  :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
                  type="button"
                  @click="removeVenue(venue.id)"
                >
                  Retirer
                </button>
              </li>
            </ul>
          </div>

          <div class="flex justify-end">
            <button
              :disabled="isActionDisabled || mainLoading"
              :aria-disabled="isActionDisabled || mainLoading"
              class="btn btn-primary"
              :class="isActionDisabled || mainLoading ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
              type="submit"
            >
              {{ mainLoading ? 'Enregistrement…' : 'Save changes' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Onglet Dates (affichage HH:MM, padding 0, boucle, format 2 chiffres, séparateur :) -->
      <div v-else-if="activeTab === 'dates'">
        <form class="space-y-6" @submit.prevent="saveDates">
          <div class="card bg-base-100 shadow p-4">
            <label class="block font-semibold mb-1">Date et heure de début</label>
            <div class="flex flex-wrap gap-2 items-center">
              <input
                v-model="datesForm.startDate"
                class="input input-bordered"
                type="date"
                :disabled="isReadOnly"
                :aria-disabled="isReadOnly"
                required
              >
              <div class="flex items-center gap-1">
                <input
                  v-model.number="datesForm.startHour"
                  class="input input-bordered w-16 text-center"
                  type="number"
                  min="0" max="23"
                  :disabled="isReadOnly"
                  :aria-disabled="isReadOnly"
                  required
                  @change="onHourChange('startHour')"
                  @blur="onHourBlur('startHour')"
                >
                <span class="font-mono">:</span>
                <input
                  v-model.number="datesForm.startMinute"
                  class="input input-bordered w-16 text-center"
                  type="number"
                  min="0" max="59"
                  :disabled="isReadOnly"
                  :aria-disabled="isReadOnly"
                  required
                  @change="onMinuteChange('startMinute')"
                  @blur="onMinuteBlur('startMinute')"
                >
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">Set date and time when your event begin. This information could be visible on tickets.</div>
          </div>
          <div class="card bg-base-100 shadow p-4">
            <label class="block font-semibold mb-1">Date et heure de fin</label>
            <div class="flex flex-wrap gap-2 items-center">
              <input
                v-model="datesForm.endDate"
                class="input input-bordered"
                type="date"
                :disabled="isReadOnly"
                :aria-disabled="isReadOnly"
                required
              >
              <div class="flex items-center gap-1">
                <input
                  v-model.number="datesForm.endHour"
                  class="input input-bordered w-16 text-center"
                  type="number"
                  min="0" max="23"
                  :disabled="isReadOnly"
                  :aria-disabled="isReadOnly"
                  required
                  @change="onHourChange('endHour')"
                  @blur="onHourBlur('endHour')"
                >
                <span class="font-mono">:</span>
                <input
                  v-model.number="datesForm.endMinute"
                  class="input input-bordered w-16 text-center"
                  type="number"
                  min="0" max="59"
                  :disabled="isReadOnly"
                  :aria-disabled="isReadOnly"
                  required
                  @change="onMinuteChange('endMinute')"
                  @blur="onMinuteBlur('endMinute')"
                >
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">Set date and time when your event ends. This information could be visible on tickets.</div>
          </div>
          <div class="flex justify-end">
            <button
              :disabled="isReadOnly || datesLoading"
              :aria-disabled="isReadOnly || datesLoading"
              class="btn btn-primary"
              type="submit"
            >
              {{ datesLoading ? 'Enregistrement…' : 'Save changes' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Onglet Banner -->
      <div v-else-if="activeTab === 'banner'">
        <div class="card bg-base-100 shadow p-4 flex flex-col items-center">
          <div v-if="event && event.image_url" class="mb-4">
            <img :src="event.image_url" alt="Event image" class="max-h-48 rounded-lg shadow" >
          </div>
          <div class="w-full flex flex-col items-center">
            <div
              class="w-full max-w-md h-32 flex items-center justify-center bg-gray-200 rounded-lg border-2 border-dashed border-gray-400 text-gray-400 cursor-not-allowed relative group"
              :aria-disabled="true"
            >
              <span>Importer une nouvelle image</span>
              <div class="absolute inset-0 bg-gray-200 bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span class="text-gray-500">Feature will be implemented later</span>
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-2 text-center">
              Recommended size ratio is <b>1.77</b> (16:9, e.g. <b>1600x900px</b>).
            </div>
          </div>
          <div class="flex justify-end w-full mt-4">
            <button class="btn btn-primary" type="button" disabled aria-disabled="true">Save changes</button>
          </div>
        </div>
      </div>

      <!-- Onglet URL -->
      <div v-else-if="activeTab === 'url'">
        <div class="card bg-base-100 shadow p-4">
          <div class="mb-4">
            <span class="font-semibold">Adresse permanente :</span>
            <a
              :href="permalink"
              class="link link-primary break-all ml-2"
              target="_blank"
              rel="noopener"
            >
              {{ permalink }}
            </a>
          </div>
          <div class="mb-2">
            <label class="block font-semibold mb-1">Adresse personnalisée</label>
            <input
              disabled
              aria-disabled="true"
              class="input input-bordered w-full cursor-not-allowed bg-gray-100"
              placeholder="Feature will be implemented later"
            >
          </div>
          <div class="text-xs text-gray-400">Feature will be implemented later</div>
          <div class="flex justify-end mt-4">
            <button class="btn btn-primary" type="button" disabled aria-disabled="true">Save changes</button>
          </div>
        </div>
      </div>

      <!-- Onglet Payouts -->
      <div v-else-if="activeTab === 'payouts'">
        <div class="card bg-base-100 shadow p-4">
          <h2 class="font-semibold text-lg mb-4">Gestion des payouts promoteurs</h2>
          <div v-if="event && event.promoter_stripe_account_id" class="mb-2">
            <span class="badge badge-info">Stripe Account ID lié à l'événement : <span class="font-mono">{{ event.promoter_stripe_account_id }}</span></span>
          </div>
          <div class="alert alert-info mb-4 flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"/></svg>
            <span>Only one promoter can be linked for payouts. To change, unlink the current promoter first.</span>
          </div>
          <table class="table w-full">
            <thead>
              <tr>
                <th>Nom du promoteur</th>
                <th>Stripe Account ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <!-- Promoteur actuellement lié, même si non accessible à l'utilisateur -->
              <tr v-if="event && event.promoter_stripe_account_id && currentLinkedPromoter" class="bg-base-200">
                <td>{{ currentLinkedPromoter.name }}</td>
                <td>{{ currentLinkedPromoter.stripe_account_id }}</td>
                <td>
                  <button
                    v-if="!isReadOnly"
                    class="btn btn-error btn-sm"
                    @click="unlinkPromoterStripe(currentLinkedPromoter)"
                  >Unlink</button>
                  <span v-else class="text-gray-400">—</span>
                </td>
              </tr>
              <!-- Liste des promoteurs accessibles, hors promoteur déjà lié -->
              <tr v-for="prom in filteredAllowedPromoters" :key="prom.id">
                <td>{{ prom.name }}</td>
                <td>{{ prom.stripe_account_id || '—' }}</td>
                <td>
                  <span v-if="!prom.stripe_account_id || event.promoter_stripe_account_id" class="text-gray-400">—</span>
                  <button
                    v-else
                    class="btn btn-primary btn-sm"
                    :disabled="isReadOnly"
                    :aria-disabled="isReadOnly"
                    @click="linkPromoterStripe(prom)"
                  >
                    Lier ce promoteur
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Ajout Organizer (multi) stylée -->
      <dialog id="promoterModal" class="modal" :open="showPromoterModal">
        <form class="modal-box max-w-lg" method="dialog" @submit.prevent="saveSelectedPromoters">
          <h3 class="font-bold text-lg mb-2">Ajouter des organisateurs</h3>
          <input
            v-model="promoterSearch"
            :disabled="isReadOnly"
            class="input input-bordered w-full mb-2"
            placeholder="Rechercher un organisateur…"
            @input="searchPromoters"
          >
          <ul>
            <li
              v-for="prom in promoterResults"
              :key="prom.id"
              class="flex items-center justify-between py-1"
            >
              <span>{{ prom.name }}</span>
              <input
                v-model="selectedPromoters"
                type="checkbox"
                :value="prom"
                :disabled="isReadOnly"
                :aria-disabled="isReadOnly"
                class="checkbox checkbox-primary checkbox-sm ml-2"
              >
            </li>
          </ul>
          <div class="modal-action flex gap-2">
            <button class="btn btn-primary" type="submit" :disabled="isReadOnly">Save</button>
            <button class="btn" type="button" @click="closePromoterModal">Fermer</button>
          </div>
        </form>
        <form class="modal-backdrop" method="dialog" @click="closePromoterModal">
          <button aria-label="Fermer" />
        </form>
      </dialog>
      <!-- Modal Ajout Venue (multi) stylée -->
      <dialog id="venueModal" class="modal" :open="showVenueModal">
        <form class="modal-box max-w-lg" method="dialog" @submit.prevent="saveSelectedVenues">
          <h3 class="font-bold text-lg mb-2">Ajouter des lieux</h3>
          <input
            v-model="venueSearch"
            :disabled="isReadOnly"
            class="input input-bordered w-full mb-2"
            placeholder="Rechercher un lieu…"
            @input="searchVenues"
          >
          <ul>
            <li
              v-for="venue in venueResults"
              :key="venue.id"
              class="flex items-center justify-between py-1"
            >
              <span>{{ venue.name }}</span>
              <input
                v-model="selectedVenues"
                type="checkbox"
                :value="venue"
                :disabled="isReadOnly"
                :aria-disabled="isReadOnly"
                class="checkbox checkbox-primary checkbox-sm ml-2"
              >
            </li>
          </ul>
          <div class="modal-action flex gap-2">
            <button class="btn btn-primary" type="submit" :disabled="isReadOnly">Save</button>
            <button class="btn" type="button" @click="closeVenueModal">Fermer</button>
          </div>
        </form>
        <form class="modal-backdrop" method="dialog" @click="closeVenueModal">
          <button aria-label="Fermer" />
        </form>
      </dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRuntimeConfig } from 'nuxt/app'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useEntityPermission } from '~/composables/useEntityPermission'
import AdminNotification from '~/components/admin/AdminNotification.vue'

definePageMeta({
  layout: 'admin-event'
})

type Promoter = { id: number; name: string; stripe_account_id?: string }
type Venue = { id: number; name: string }
type Event = {
  id: number;
  title: string;
  banner_url?: string;
  promoter_stripe_account_id?: string | null;
  date_time?: string;
  end_date_time?: string;
}

type EventPromoterRow = { promoter_id: number; promoters: { name: string } }
type EventVenueRow = { venue_id: number; venues: { name: string } }

const tabs = [
  { key: 'main', label: 'Main' },
  { key: 'dates', label: 'Dates' },
  { key: 'banner', label: 'Banner' },
  { key: 'url', label: 'URL' },
  { key: 'payouts', label: 'Payouts' }
]
const activeTab = ref('main')

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const config = useRuntimeConfig()

const eventId = Number(route.params.id)
const event = ref<Event | null>(null)
const loadingEvent = ref(true)

const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')
const permissionLoading = ref(true)
const isReadOnly = computed(() => currentUserPermission.value === 1)
const isActionDisabled = computed(() => permissionLoading.value || isReadOnly.value)

const notification = ref({
  show: false,
  type: 'info',
  message: '',
  description: '',
  duration: 4000
})
function showNotif(type: 'success'|'error'|'info'|'warning', message: string, description = '') {
  notification.value = { show: true, type, message, description, duration: 4000 }
}

const mainForm = ref({
  title: '',
  promoters: [] as Promoter[],
  venues: [] as Venue[]
})
const mainLoading = ref(false)

// Promoters/venues pour modals multi-select
const promoterSearch = ref('')
const promoterResults = ref<Promoter[]>([])
const selectedPromoters = ref<Promoter[]>([])
const showPromoterModal = ref(false)

const venueSearch = ref('')
const venueResults = ref<Venue[]>([])
const selectedVenues = ref<Venue[]>([])
const showVenueModal = ref(false)

// Payouts
const allPromoters = ref<Promoter[]>([])
async function fetchAllPromoters() {
  const { data } = await supabase.from('promoters').select('id, name, stripe_account_id')
  allPromoters.value = data || []
}

async function linkPromoterStripe(prom: Promoter) {
  if (isReadOnly.value) return;
  const { error } = await (supabase.from('events') as any).update({ promoter_stripe_account_id: prom.stripe_account_id || null }).eq('id', eventId)
  if (error) showNotif('error', "Erreur lors du lien Stripe", error.message)
  else {
    showNotif('success', 'Promoteur lié à l’événement')
    await fetchEvent()
  }
}
async function unlinkPromoterStripe(_prom: Promoter) {
  if (isReadOnly.value) return;
  const { error } = await (supabase.from('events') as any).update({ promoter_stripe_account_id: null }).eq('id', eventId)
  if (error) showNotif('error', "Erreur lors de la suppression du lien", error.message)
  else {
    showNotif('success', 'Lien Stripe supprimé')
    await fetchEvent()
  }
}

function openPromoterModal() {
  if (isReadOnly.value) return;
  promoterSearch.value = ''
  promoterResults.value = []
  selectedPromoters.value = []
  showPromoterModal.value = true
  searchPromoters()
}
function closePromoterModal() { showPromoterModal.value = false }
async function saveSelectedPromoters() {
  if (isReadOnly.value) return;
  for (const prom of selectedPromoters.value) {
    if (!mainForm.value.promoters.some((p: Promoter) => p.id === prom.id)) {
      mainForm.value.promoters.push(prom)
    }
  }
  closePromoterModal()
}
function removePromoter(id: number) {
  if (isReadOnly.value) return;
  mainForm.value.promoters = mainForm.value.promoters.filter(p => p.id !== id)
}

function openVenueModal() {
  if (isReadOnly.value) return;
  venueSearch.value = ''
  venueResults.value = []
  selectedVenues.value = []
  showVenueModal.value = true
  searchVenues()
}
function closeVenueModal() { showVenueModal.value = false }
async function saveSelectedVenues() {
  if (isReadOnly.value) return;
  for (const venue of selectedVenues.value) {
    if (!mainForm.value.venues.some((v: Venue) => v.id === venue.id)) {
      mainForm.value.venues.push(venue)
    }
  }
  closeVenueModal()
}
function removeVenue(id: number) {
  if (isReadOnly.value) return;
  mainForm.value.venues = mainForm.value.venues.filter(v => v.id !== id)
}

// Dates tab
const datesForm = ref({
  startDate: '',
  startHour: 0,
  startMinute: 0,
  endDate: '',
  endHour: 0,
  endMinute: 0
})
const datesLoading = ref(false)

const userIdInt = ref<number|null>(null)
const permalink = computed(() => {
  const base = config.public?.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/event/${eventId}/`
})

async function fetchEvent() {
  loadingEvent.value = true
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
  if (error) {
    showNotif('error', "Erreur lors de la récupération de l'événement", error.message)
  } else if (data) {
    event.value = data
    mainForm.value.title = (data as any).title
    // Promoters liés à l'event
    const { data: eventProms } = await supabase
      .from('event_promoter')
      .select('promoter_id, promoters(name)')
      .eq('event_id', eventId)
    mainForm.value.promoters = ((eventProms || []) as any[]).map((ep: any) => ({ id: ep.promoter_id, name: ep.promoters?.name }))
    // Venues liés à l'event
    const { data: eventVenues } = await supabase
      .from('event_venue')
      .select('venue_id, venues(name)')
      .eq('event_id', eventId)
    mainForm.value.venues = ((eventVenues || []) as any[]).map((ev: any) => ({ id: ev.venue_id, name: ev.venues?.name }))
    // Dates
    if ((data as any).date_time) {
      const start = new Date((data as any).date_time)
      datesForm.value.startDate = start.toISOString().slice(0,10)
      datesForm.value.startHour = start.getHours()
      datesForm.value.startMinute = start.getMinutes()
    }
    if ((data as any).end_date_time) {
      const end = new Date((data as any).end_date_time)
      datesForm.value.endDate = end.toISOString().slice(0,10)
      datesForm.value.endHour = end.getHours()
      datesForm.value.endMinute = end.getMinutes()
    }
  }
  loadingEvent.value = false
}

async function fetchUserInternalId() {
  if (!user.value) return
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.value.id)
    .single()
  if (!error && data) userIdInt.value = (data as any).id
}

async function searchPromoters() {
  if (!userIdInt.value) return
  const { data: perms } = await supabase
    .from('user_permissions')
    .select('entity_id')
    .eq('user_id', userIdInt.value)
    .eq('entity_type', 'promoter')
    .in('permission_level', [1,2,3])
  const promoterIds = (perms || []).map((p: {entity_id: number}) => p.entity_id)
  const { data: proms } = await supabase
    .from('promoters')
    .select('id, name')
    .in('id', promoterIds)
  promoterResults.value = (proms || [])
    .filter((p: Promoter) => !mainForm.value.promoters.some(mp => mp.id === p.id) && (!promoterSearch.value || p.name.toLowerCase().includes(promoterSearch.value.toLowerCase())))
    .slice(0,5)
}

async function searchVenues() {
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
  venueResults.value = (venues || [])
    .filter((v: Venue) => !mainForm.value.venues.some(mv => mv.id === v.id) && (!venueSearch.value || v.name.toLowerCase().includes(venueSearch.value.toLowerCase())))
    .slice(0,5)
}

onMounted(async () => {
  permissionLoading.value = true
  await fetchPermission()
  permissionLoading.value = false
  await fetchUserInternalId()
  await fetchUserPromoterIds()
  await fetchEvent()
  await fetchAllPromoters()
  // eslint-disable-next-line no-console
  console.log('[PAGE] settings.vue mounted, route:', route.path)
})

// SAVE MAIN
async function saveMain() {
  if (isReadOnly.value) return;
  mainLoading.value = true
  // Update event title
  const { error: err1 } = await (supabase.from('events') as any)
    .update({ title: mainForm.value.title })
    .eq('id', eventId)
  // Update event_promoter
  const { data: currentProms } = await supabase
    .from('event_promoter')
    .select('promoter_id')
    .eq('event_id', eventId)
  const toAddProms = mainForm.value.promoters.filter(p => !(currentProms as any[])?.some((cp: any) => cp.promoter_id === p.id))
  const toRemoveProms = (currentProms as any[])?.filter((cp: any) => !mainForm.value.promoters.some(p => p.id === cp.promoter_id)) || []
  for (const p of toAddProms) {
    await (supabase.from('event_promoter') as any).insert({ event_id: eventId, promoter_id: p.id })
  }
  for (const p of toRemoveProms) {
    await (supabase.from('event_promoter') as any).delete().eq('event_id', eventId).eq('promoter_id', p.promoter_id)
  }
  // Update event_venue
  const { data: currentVenues } = await supabase
    .from('event_venue')
    .select('venue_id')
    .eq('event_id', eventId)
  const toAddVenues = mainForm.value.venues.filter(v => !(currentVenues as any[])?.some((cv: any) => cv.venue_id === v.id))
  const toRemoveVenues = (currentVenues as any[])?.filter((cv: any) => !mainForm.value.venues.some(v => v.id === cv.venue_id)) || []
  for (const v of toAddVenues) {
    await (supabase.from('event_venue') as any).insert({ event_id: eventId, venue_id: v.id })
  }
  for (const v of toRemoveVenues) {
    await (supabase.from('event_venue') as any).delete().eq('event_id', eventId).eq('venue_id', v.venue_id)
  }
  if (err1) {
    showNotif('error', "Erreur lors de l'enregistrement", err1.message)
  } else {
    showNotif('success', 'Modifications enregistrées')
    await fetchEvent()
  }
  mainLoading.value = false
}

// SAVE DATES
async function saveDates() {
  if (isReadOnly.value) return;
  datesLoading.value = true
  // Compose ISO strings
  const start = new Date(`${datesForm.value.startDate}T${String(datesForm.value.startHour).padStart(2,'0')}:${String(datesForm.value.startMinute).padStart(2,'0')}:00`)
  const end = new Date(`${datesForm.value.endDate}T${String(datesForm.value.endHour).padStart(2,'0')}:${String(datesForm.value.endMinute).padStart(2,'0')}:00`)
  const { error } = await supabase
    .from('events')
    .update({ date_time: start.toISOString(), end_date_time: end.toISOString() })
    .eq('id', eventId)
  if (error) {
    showNotif('error', "Erreur lors de l'enregistrement des dates", error.message)
  } else {
    showNotif('success', 'Dates enregistrées')
    await fetchEvent()
  }
  datesLoading.value = false
}

// Promoteurs autorisés pour payouts (droits 1-3)
const allowedPromoters = computed(() => {
  // On suppose que userIdInt est bien défini après fetchUserInternalId
  if (!userIdInt.value) return []
  // On filtre allPromoters selon user_permissions
  return allPromoters.value.filter(prom =>
    userPromoterIds.value.includes(prom.id)
  )
})
const userPromoterIds = ref<number[]>([])
async function fetchUserPromoterIds() {
  if (!userIdInt.value) return
  const { data: perms } = await supabase
    .from('user_permissions')
    .select('entity_id')
    .eq('user_id', userIdInt.value)
    .eq('entity_type', 'promoter')
    .in('permission_level', [1,2,3])
  userPromoterIds.value = (perms || []).map((p: {entity_id: number}) => p.entity_id)
}

// Format affichage HH:MM toujours 2 chiffres
function pad2(n: number) { return n.toString().padStart(2, '0') }
function onHourChange(field: 'startHour'|'endHour') {
  if (datesForm.value[field] > 23) datesForm.value[field] = 0
  if (datesForm.value[field] < 0) datesForm.value[field] = 23
}
function onMinuteChange(field: 'startMinute'|'endMinute') {
  if (datesForm.value[field] > 59) datesForm.value[field] = 0
  if (datesForm.value[field] < 0) datesForm.value[field] = 59
}
function onHourBlur(field: 'startHour'|'endHour') {
  datesForm.value[field] = Number(pad2(datesForm.value[field]))
}
function onMinuteBlur(field: 'startMinute'|'endMinute') {
  datesForm.value[field] = Number(pad2(datesForm.value[field]))
}

onMounted(async () => {
  await fetchPermission()
  await fetchUserInternalId()
  await fetchUserPromoterIds()
  await fetchEvent()
  await fetchAllPromoters()

  // eslint-disable-next-line no-console
  console.log('[PAGE] settings.vue mounted, route:', route.path)
})

// Promoteur actuellement lié (même si non accessible)
const currentLinkedPromoter = computed(() => {
  if (!event.value || !event.value.promoter_stripe_account_id) return null;
  // Cherche dans allPromoters
  const found = allPromoters.value.find(p => p.stripe_account_id === event.value?.promoter_stripe_account_id)
  if (found) return found
  // Si pas trouvé, retourne un objet minimal
  return {
    name: 'Unknown promoter',
    stripe_account_id: event.value.promoter_stripe_account_id
  }
})
// Liste filtrée des promoteurs accessibles hors promoteur déjà lié
const filteredAllowedPromoters = computed(() => {
  if (!event.value || !event.value.promoter_stripe_account_id) return allowedPromoters.value
  return allowedPromoters.value.filter(p => p.stripe_account_id !== event.value.promoter_stripe_account_id)
})
</script>

<style scoped>
.tabs {
  /* daisyUI tabs already styled, juste spacing */
}
.modal {
  z-index: 50;
}
</style>