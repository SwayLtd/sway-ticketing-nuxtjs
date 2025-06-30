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
        <button v-for="tab in tabs" :key="tab.key" role="tab"
          :class="['tab', activeTab === tab.key ? 'tab-active' : '', 'focus:outline-none']"
          :aria-selected="activeTab === tab.key" @click="onTabClick(tab.key)">
          {{ tab.label }}
        </button>
      </div>

      <!-- Notifications -->
      <AdminNotification v-if="notification.show" :type="notification.type" :message="notification.message"
        :description="notification.description" :duration="notification.duration" @close="notification.show = false" />

      <!-- Onglet Main -->
      <div v-if="activeTab === 'main'">
        <form class="" @submit.prevent="saveMain">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Ligne 1 : Nom (gauche) & Description (droite) -->
            <div class="card bg-base-100 shadow p-4 flex flex-col h-full">
              <label class="block font-semibold mb-1" for="eventName">Nom de l'événement</label>
              <input id="eventName" v-model="mainForm.title" class="input input-bordered w-full"
                :disabled="isActionDisabled" :aria-disabled="isActionDisabled" required>
            </div>
            <div class="card bg-base-100 shadow p-4 flex flex-col h-full">
              <label class="block font-semibold mb-1" for="eventDescription">Description</label>
              <textarea id="eventDescription" v-model="mainForm.description" rows="4"
                class="textarea textarea-bordered w-full min-h-[3.5rem]" :disabled="isActionDisabled"
                :aria-disabled="isActionDisabled" placeholder="Décrivez votre événement..." />
            </div>

            <!-- Ligne 2 : Type d'événement (gauche) & Genres (droite) -->
            <div class="card bg-base-100 shadow p-4">
              <label class="block font-semibold mb-1" for="eventType">Type d'événement</label>
              <select id="eventType" v-model="mainForm.type" class="select select-bordered w-full"
                :disabled="isActionDisabled" :aria-disabled="isActionDisabled">
                <option value="festival">Festival</option>
                <option value="rave">Rave</option>
                <option value="party">Party</option>
                <option value="concert">Concert</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="card bg-base-100 shadow p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold">Genres</span>
                <button type="button" class="btn btn-sm btn-primary" :disabled="isActionDisabled"
                  :aria-disabled="isActionDisabled" @click="openGenreModal">Ajouter un genre</button>
              </div>
              <div v-if="mainForm.genres.length === 0" class="text-gray-400">Aucun genre sélectionné.</div>
              <div class="flex flex-wrap gap-2">
                <span v-for="genre in mainForm.genres" :key="genre.id" class="badge badge-primary gap-1 items-center">
                  {{ genre.name }}
                  <button v-if="!isActionDisabled" type="button" class="btn btn-xs btn-circle btn-ghost ml-1"
                    aria-label="Supprimer le genre" @click="removeGenre(genre.id)">✕</button>
                </span>
              </div>
            </div>

            <!-- Timetable & Ticket link (côte à côte) -->
            <div class="flex flex-col gap-6 md:flex-row md:col-span-2">
              <!-- Timetable -->
              <div class="card bg-base-100 shadow p-4 flex-1 flex flex-col gap-2">
                <label class="font-semibold mb-1">Timetable</label>
                <div class="flex items-center gap-4">
                  <input v-model="mainForm.metadata.timetable" type="checkbox" class="toggle toggle-primary"
                    :disabled="isActionDisabled" :aria-disabled="isActionDisabled">
                  <span class="text-xs text-gray-400">Activer ou désactiver l'affichage du timetable sur la page
                    event</span>
                </div>
              </div>
              <!-- Ticket link & Sway Tickets -->
              <div class="card bg-base-100 shadow p-4 flex-1 flex flex-col gap-2">
                <label class="block font-semibold mb-1">Lien de billetterie</label>
                <div class="relative group">
                  <input v-model="mainForm.metadata.ticket_link"
                    class="input input-bordered w-full pr-12 group-hover:bg-base-200 transition"
                    :readonly="mainForm.metadata.sway_tickets" :disabled="isActionDisabled"
                    :aria-readonly="mainForm.metadata.sway_tickets" :aria-disabled="isActionDisabled"
                    placeholder="https://...">
                  <button type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-xs btn-ghost opacity-70 group-hover:opacity-100"
                    title="Copier dans le presse-papier" tabindex="-1" @click.prevent="copyTicketLink">
                    <!-- Nouveau pictogramme : icône de clipboard moderne -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z" />
                    </svg>
                  </button>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <input v-model="mainForm.metadata.sway_tickets" type="checkbox" class="toggle toggle-primary"
                    :disabled="isActionDisabled" :aria-disabled="isActionDisabled">
                  <span class="font-semibold">Utiliser Sway Tickets</span>
                </div>
                <!-- Info messages sous le toggle Sway Tickets -->
                <div v-if="mainForm.metadata.sway_tickets" class="mt-2 space-y-2">
                  <div class="alert alert-info flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 stroke-current shrink-0" fill="none"
                      viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                    <span>Pour recevoir les paiements, il faut lier un compte dans l'onglet <b>Payouts</b>.</span>
                  </div>
                  <div class="alert alert-info flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 stroke-current shrink-0" fill="none"
                      viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                    <span>Il faut configurer les tickets dans l'onglet <NuxtLink :to="`/admin/event/${eventId}/tickets`"
                        class="link link-primary">Tickets</NuxtLink>.</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Organisateurs & Lieux (côte à côte, déplacé au-dessus) -->
            <div class="flex flex-col gap-6 md:flex-row md:col-span-2">
              <!-- Organisateurs -->
              <div class="card bg-base-100 shadow p-4 flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-semibold">Organisateurs</span>
                  <button :disabled="isActionDisabled" :aria-disabled="isActionDisabled" class="btn btn-sm btn-primary"
                    :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''" type="button"
                    @click="openPromoterModal">
                    Ajouter un organisateur
                  </button>
                </div>
                <div v-if="mainForm.promoters.length === 0" class="text-gray-400">Aucun organisateur lié.</div>
                <ul>
                  <li v-for="prom in mainForm.promoters" :key="prom.id" class="flex items-center justify-between py-1">
                    <span>{{ prom.name }}</span>
                    <div v-if="mainForm.promoters.length === 1" class="tooltip"
                      data-tip="Il doit rester au moins 1 organisateur assigné.">
                      <button :disabled="true" aria-disabled="true"
                        class="btn btn-xs btn-error btn-disabled opacity-50 cursor-not-allowed" type="button">
                        Retirer
                      </button>
                    </div>
                    <button v-else :disabled="isActionDisabled" :aria-disabled="isActionDisabled"
                      class="btn btn-xs btn-error"
                      :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''" type="button"
                      @click="removePromoter(prom.id)">
                      Retirer
                    </button>
                  </li>
                </ul>
              </div>
              <!-- Lieux -->
              <div class="card bg-base-100 shadow p-4 flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-semibold">Lieux</span>
                  <button :disabled="isActionDisabled" :aria-disabled="isActionDisabled" class="btn btn-sm btn-primary"
                    :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''" type="button"
                    @click="openVenueModal">
                    Ajouter un lieu
                  </button>
                </div>
                <div v-if="mainForm.venues.length === 0" class="text-gray-400">Aucun lieu lié.</div>
                <ul>
                  <li v-for="venue in mainForm.venues" :key="venue.id" class="flex items-center justify-between py-1">
                    <span>{{ venue.name }}</span>
                    <div v-if="mainForm.venues.length === 1" class="tooltip"
                      data-tip="Il doit rester au moins 1 lieu assigné.">
                      <button :disabled="true" aria-disabled="true"
                        class="btn btn-xs btn-error btn-disabled opacity-50 cursor-not-allowed" type="button">
                        Retirer
                      </button>
                    </div>
                    <button v-else :disabled="isActionDisabled" :aria-disabled="isActionDisabled"
                      class="btn btn-xs btn-error"
                      :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''" type="button"
                      @click="removeVenue(venue.id)">
                      Retirer
                    </button>
                  </li>
                </ul>
              </div>
            </div>

          </div>
          <div class="flex justify-end mt-6">
            <button :disabled="isActionDisabled || mainLoading" :aria-disabled="isActionDisabled || mainLoading"
              class="btn btn-primary"
              :class="isActionDisabled || mainLoading ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
              type="submit">
              {{ mainLoading ? 'Enregistrement…' : 'Save changes' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Onglet Dates (affichage HH:MM, padding 0, boucle, format 2 chiffres, séparateur :) -->
      <div v-else-if="activeTab === 'dates'">
        <form class="space-y-6" @submit.prevent="saveDates">
          <!-- Timetable switch (affiché aussi dans Main) -->
          <div class="card bg-base-100 shadow p-4 flex flex-col gap-2">
            <label class="font-semibold mb-1">Timetable</label>
            <div class="flex items-center gap-4">
              <input v-model="mainForm.metadata.timetable" type="checkbox" class="toggle toggle-primary"
                :disabled="isActionDisabled" :aria-disabled="isActionDisabled">
              <span class="text-xs text-gray-400">Enable or disable the timetable for this event</span>
            </div>
          </div>
          <!-- Dates -->
          <div class="card bg-base-100 shadow p-4">
            <label class="block font-semibold mb-1">Date et heure de début</label>
            <div class="flex flex-wrap gap-2 items-center">
              <input v-model="datesForm.startDate" class="input input-bordered" type="date" :disabled="isReadOnly"
                :aria-disabled="isReadOnly" required>
              <div class="flex items-center gap-1">
                <input v-model.number="datesForm.startHour" class="input input-bordered w-16 text-center" type="number"
                  min="0" max="23" :disabled="isReadOnly" :aria-disabled="isReadOnly" required
                  @change="onHourChange('startHour')" @blur="onHourBlur('startHour')">
                <span class="font-mono">:</span>
                <input v-model.number="datesForm.startMinute" class="input input-bordered w-16 text-center"
                  type="number" min="0" max="59" :disabled="isReadOnly" :aria-disabled="isReadOnly" required
                  @change="onMinuteChange('startMinute')" @blur="onMinuteBlur('startMinute')">
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">Set date and time when your event begin. This information could be
              visible on tickets.</div>
          </div>
          <div class="card bg-base-100 shadow p-4">
            <div class="flex items-center gap-2 mb-1">
              <label class="block font-semibold" for="endDate">Date et heure de fin
                <span v-if="!mainForm.metadata.timetable" class="text-xs text-gray-400">(optionnel)</span>
                <span v-else class="text-xs text-error">(required if timetable enabled)</span>
              </label>
              <button v-if="!mainForm.metadata.timetable" type="button" class="btn btn-xs btn-circle btn-ghost"
                :disabled="isReadOnly" :aria-disabled="isReadOnly" title="Supprimer la date de fin"
                @click="clearEndDate"><span aria-hidden="true">✕</span></button>
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <input id="endDate" v-model="datesForm.endDate" class="input input-bordered" type="date"
                :disabled="isReadOnly" :aria-disabled="isReadOnly" :required="mainForm.metadata.timetable">
              <div class="flex items-center gap-1">
                <input v-model.number="datesForm.endHour" class="input input-bordered w-16 text-center" type="number"
                  min="0" max="23" :disabled="isReadOnly" :aria-disabled="isReadOnly" @change="onHourChange('endHour')"
                  @blur="onHourBlur('endHour')" :required="mainForm.metadata.timetable">
                <span class="font-mono">:</span>
                <input v-model.number="datesForm.endMinute" class="input input-bordered w-16 text-center" type="number"
                  min="0" max="59" :disabled="isReadOnly" :aria-disabled="isReadOnly"
                  @change="onMinuteChange('endMinute')" @blur="onMinuteBlur('endMinute')"
                  :required="mainForm.metadata.timetable">
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">Set date and time when your event ends. This information could be
              visible on tickets.</div>
          </div>

          <!-- Manage Days (visible si timetable activé) -->
          <div v-if="mainForm.metadata.timetable" class="card bg-base-100 shadow p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-lg">Manage Days</span>
              <button type="button" class="btn btn-primary btn-sm" @click="openAddDayModal"
                :disabled="isActionDisabled">Add Day</button>
            </div>
            <draggable v-model="festivalDays" item-key="name" handle=".drag-handle" class="space-y-2"
              :disabled="isActionDisabled">
              <template #item="{ element, index }">
                <div class="card bg-base-200 p-3 flex flex-col md:flex-row md:items-center gap-2 relative">
                  <span class="drag-handle cursor-move mr-2 text-gray-400" title="Drag to reorder">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                  </span>
                  <div class="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                    <span class="font-semibold">{{ element.name }}</span>
                    <span class="text-xs text-gray-500">{{ formatDayDate(element.start) }} - {{
                      formatDayDate(element.end) }}</span>
                  </div>
                  <div class="flex gap-2 ml-auto">
                    <button class="btn btn-xs btn-ghost" :disabled="isActionDisabled" @mousedown.prevent.stop
                      @click.stop="editDay(index)" type="button">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6z" />
                      </svg>
                    </button>
                    <button class="btn btn-xs btn-error" :disabled="isActionDisabled" @mousedown.prevent
                      @click="removeDay(index)" type="button"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M6 18L18 6M6 6l12 12" />
                      </svg></button>
                  </div>
                </div>
              </template>
            </draggable>
            <div v-if="festivalDays.length === 0" class="text-gray-400 mt-2">No days added yet.</div>
          </div>

          <div class="flex justify-end">
            <button :disabled="isReadOnly || datesLoading" :aria-disabled="isReadOnly || datesLoading"
              class="btn btn-primary" type="submit">
              {{ datesLoading ? 'Enregistrement…' : 'Save changes' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Onglet Stages -->
      <div v-else-if="activeTab === 'stages'">
        <form class="space-y-6" @submit.prevent="saveStages">
          <div class="card bg-base-100 shadow p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-lg">Manage Stages</span>
              <button type="button" class="btn btn-primary btn-sm" @click="openAddStageModal"
                :disabled="isActionDisabled">Add
                Stage</button>
            </div>
            <draggable v-model="stages" item-key="name" handle=".drag-handle" class="space-y-2"
              :disabled="isActionDisabled">
              <template #item="{ element, index }">
                <div class="card bg-base-200 p-3 flex flex-col md:flex-row md:items-center gap-2">
                  <span class="drag-handle cursor-move mr-2 text-gray-400" title="Drag to reorder">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                  </span>
                  <div class="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                    <span class="font-semibold">{{ element && element.name ? element.name : '—' }}</span>
                  </div>
                  <div class="flex gap-2 ml-auto">
                    <button class="btn btn-xs btn-ghost" :disabled="isActionDisabled" @mousedown.prevent.stop
                      @click.stop="editStage(index)" type="button">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6z" />
                      </svg>
                    </button>
                    <button class="btn btn-xs btn-error" :disabled="isActionDisabled" @mousedown.prevent
                      @click="removeStage(index)" type="button">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </template>
            </draggable>
            <div v-if="stages.length === 0" class="text-gray-400 mt-2">No stages added yet.</div>
          </div>
          <div class="flex justify-end mt-4">
            <button class="btn btn-primary" :disabled="isActionDisabled || stagesLoading" type="submit">
              {{ stagesLoading ? 'Enregistrement…' : 'Save changes' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Onglet Banner -->
      <div v-else-if="activeTab === 'banner'">
        <div class="card bg-base-100 shadow p-4 flex flex-col items-center">
          <div v-if="event && event.image_url" class="mb-4">
            <img :src="event.image_url" alt="Event image" class="max-h-48 rounded-lg shadow">
          </div>
          <div class="w-full flex flex-col items-center">
            <div
              class="w-full max-w-md h-32 flex items-center justify-center bg-gray-200 rounded-lg border-2 border-dashed border-gray-400 text-gray-400 cursor-not-allowed relative group"
              :aria-disabled="true">
              <span>Importer une nouvelle image</span>
              <div
                class="absolute inset-0 bg-gray-200 bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
            <a :href="permalink" class="link link-primary break-all ml-2" target="_blank" rel="noopener">
              {{ permalink }}
            </a>
          </div>
          <div class="mb-2">
            <label class="block font-semibold mb-1">Adresse personnalisée</label>
            <input disabled aria-disabled="true" class="input input-bordered w-full cursor-not-allowed bg-gray-100"
              placeholder="Feature will be implemented later">
          </div>
          <div class="text-xs text-gray-400">Feature will be implemented later</div>
          <div class="flex justify-end mt-4">
            <button class="btn btn-primary" type="button" disabled aria-disabled="true">Save changes</button>
          </div>
        </div>
      </div>

      <!-- Onglet Payouts -->
      <div v-else-if="activeTab === 'payouts' && event && event.metadata && event.metadata.sway_tickets === true">
        <div class="card bg-base-100 shadow p-4">
          <h2 class="font-semibold text-lg mb-4">Gestion des payouts promoteurs</h2>
          <div v-if="event && event.promoter_stripe_account_id" class="mb-2">
            <span class="badge badge-info">Stripe Account ID lié à l'événement : <span class="font-mono">{{
              event.promoter_stripe_account_id }}</span></span>
          </div>
          <div class="alert alert-info mb-4 flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 stroke-current shrink-0" fill="none"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
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
                  <button v-if="!isReadOnly" class="btn btn-error btn-sm"
                    @click="unlinkPromoterStripe(currentLinkedPromoter)">Unlink</button>
                  <span v-else class="text-gray-400">—</span>
                </td>
              </tr>
              <!-- Liste des promoteurs accessibles, hors promoteur déjà lié -->
              <tr v-for="prom in filteredAllowedPromoters" :key="prom.id">
                <td>{{ prom.name }}</td>
                <td>{{ prom.stripe_account_id || '—' }}</td>
                <td>
                  <span v-if="!prom.stripe_account_id || event.promoter_stripe_account_id"
                    class="text-gray-400">—</span>
                  <button v-else class="btn btn-primary btn-sm" :disabled="isReadOnly" :aria-disabled="isReadOnly"
                    @click="linkPromoterStripe(prom)">
                    Lier ce promoteur
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Si on tente d'accéder à payouts sans activation -->
      <div v-else-if="activeTab === 'payouts' && (!event || !event.metadata || event.metadata.sway_tickets !== true)">
        <div class="alert alert-warning mt-8">L’onglet Payouts n’est accessible que si Sway Tickets est activé et
          sauvegardé.</div>
      </div>

      <!-- Modal Ajout Organizer (multi) stylée -->
      <dialog id="promoterModal" class="modal" :open="showPromoterModal">
        <form class="modal-box max-w-lg" method="dialog" @submit.prevent="saveSelectedPromoters">
          <h3 class="font-bold text-lg mb-2">Ajouter des organisateurs</h3>
          <input v-model="promoterSearch" :disabled="isReadOnly" class="input input-bordered w-full mb-2"
            placeholder="Rechercher un organisateur…" @input="searchPromoters">
          <ul>
            <li v-for="prom in promoterResults" :key="prom.id" class="flex items-center justify-between py-1">
              <span>{{ prom.name }}</span>
              <input v-model="selectedPromoters" type="checkbox" :value="prom" :disabled="isReadOnly"
                :aria-disabled="isReadOnly" class="checkbox checkbox-primary checkbox-sm ml-2">
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
          <input v-model="venueSearch" :disabled="isReadOnly" class="input input-bordered w-full mb-2"
            placeholder="Rechercher un lieu…" @input="searchVenues">
          <ul>
            <li v-for="venue in venueResults" :key="venue.id" class="flex items-center justify-between py-1">
              <span>{{ venue.name }}</span>
              <input v-model="selectedVenues" type="checkbox" :value="venue" :disabled="isReadOnly"
                :aria-disabled="isReadOnly" class="checkbox checkbox-primary checkbox-sm ml-2">
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
      <!-- Modal Ajout Genre -->
      <dialog id="genreModal" class="modal" :open="showGenreModal">
        <form class="modal-box max-w-lg" method="dialog" @submit.prevent="saveSelectedGenres">
          <h3 class="font-bold text-lg mb-2">Ajouter des genres</h3>
          <input v-model="genreSearch" :disabled="isActionDisabled" class="input input-bordered w-full mb-2"
            placeholder="Rechercher un genre…" @input="searchGenres">
          <ul>
            <li v-for="genre in genreResults" :key="genre.id" class="flex items-center justify-between py-1">
              <span>{{ genre.name }}</span>
              <input v-model="selectedGenres" type="checkbox" :value="genre" :disabled="isActionDisabled"
                :aria-disabled="isActionDisabled" class="checkbox checkbox-primary checkbox-sm ml-2">
            </li>
          </ul>
          <div class="modal-action flex gap-2">
            <button class="btn btn-primary" type="submit" :disabled="isActionDisabled">Save</button>
            <button class="btn" type="button" @click="closeGenreModal">Fermer</button>
          </div>
        </form>
        <form class="modal-backdrop" method="dialog" @click="closeGenreModal">
          <button aria-label="Fermer" />
        </form>
      </dialog>

      <!-- Modal Ajout/édition Jour (Day) -->
      <dialog id="dayModal" class="modal" :open="addDayModalOpen">
        <form class="modal-box max-w-lg" method="dialog" @submit.prevent="saveDay">
          <h3 class="font-bold text-lg mb-2">{{ editDayIndex !== null ? 'Edit Day' : 'Add Day' }}</h3>
          <div class="mb-2">
            <label class="block font-semibold mb-1">Day name</label>
            <input v-model="dayForm.name" class="input input-bordered w-full" required :disabled="isActionDisabled">
          </div>
          <div class="mb-2">
            <label class="block font-semibold mb-1">Start</label>
            <input v-model="dayForm.start" class="input input-bordered w-full" type="datetime-local" required
              :min="datesForm.startDate + 'T' + String(datesForm.startHour).padStart(2, '0') + ':' + String(datesForm.startMinute).padStart(2, '0')"
              :max="datesForm.endDate + 'T' + String(datesForm.endHour).padStart(2, '0') + ':' + String(datesForm.endMinute).padStart(2, '0')"
              :disabled="isActionDisabled">
          </div>
          <div class="mb-2">
            <label class="block font-semibold mb-1">End</label>
            <input v-model="dayForm.end" class="input input-bordered w-full" type="datetime-local" required
              :min="dayForm.start"
              :max="datesForm.endDate + 'T' + String(datesForm.endHour).padStart(2, '0') + ':' + String(datesForm.endMinute).padStart(2, '0')"
              :disabled="isActionDisabled">
          </div>
          <div v-if="dayFormError" class="alert alert-error mb-2">{{ dayFormError }}</div>
          <div class="modal-action flex gap-2">
            <button class="btn btn-primary" type="submit" :disabled="isActionDisabled">Save</button>
            <button class="btn" type="button" @click="addDayModalOpen = false">Cancel</button>
          </div>
        </form>
        <form class="modal-backdrop" method="dialog" @click="addDayModalOpen = false">
          <button aria-label="Fermer" />
        </form>
      </dialog>

      <!-- Modal Ajout/édition Stage -->
      <dialog id="stageModal" class="modal" :open="addStageModalOpen">
        <form class="modal-box max-w-lg" method="dialog" @submit.prevent="saveStage">
          <h3 class="font-bold text-lg mb-2">{{ editStageIndex !== null ? 'Edit Stage' : 'Add Stage' }}</h3>
          <div class="mb-2">
            <label class="block font-semibold mb-1">Stage name</label>
            <input v-model="stageForm.name" class="input input-bordered w-full" required :disabled="isActionDisabled">
          </div>
          <div v-if="stageFormError" class="alert alert-error mb-2">{{ stageFormError }}</div>
          <div class="modal-action flex gap-2">
            <button class="btn btn-primary" type="submit" :disabled="isActionDisabled">Save</button>
            <button class="btn" type="button" @click="addStageModalOpen = false">Cancel</button>
          </div>
        </form>
        <form class="modal-backdrop" method="dialog" @click="addStageModalOpen = false">
          <button aria-label="Fermer" />
        </form>
      </dialog>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, useRuntimeConfig } from 'nuxt/app'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useEntityPermission } from '~/composables/useEntityPermission'
import AdminNotification from '~/components/admin/AdminNotification.vue'
import draggable from 'vuedraggable'

definePageMeta({
  layout: 'admin-event'
})

type Promoter = { id: number; name: string; stripe_account_id?: string }
type Venue = { id: number; name: string }
type Event = {
  id: number;
  title: string;
  banner_url?: string;
  image_url?: string;
  promoter_stripe_account_id?: string | null;
  date_time?: string;
  end_date_time?: string;
  metadata?: Record<string, any>;
}

type EventPromoterRow = { promoter_id: number; promoters: { name: string } }
type EventVenueRow = { venue_id: number; venues: { name: string } }
type EventGenreRow = { genre_id: number; genres: { name: string } }


// --- Ensure event is defined before tabs ---
const event = ref<Event | null>(null)
const loadingEvent = ref(true)

// --- TABS ---
const tabs = computed(() => {
  const baseTabs = [
    { key: 'main', label: 'Main' },
    { key: 'dates', label: 'Dates' },
  ];
  if (event.value?.metadata?.timetable === true) {
    baseTabs.push({ key: 'stages', label: 'Stages' });
  }
  baseTabs.push({ key: 'banner', label: 'Banner' });
  baseTabs.push({ key: 'url', label: 'URL' });
  if (event.value?.metadata?.sway_tickets === true) {
    baseTabs.push({ key: 'payouts', label: 'Payouts' });
  }
  return baseTabs;
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

// --- Gestion dynamique du paramètre tab dans l'URL ---
const activeTab = ref('main')
const requestedTab = ref<string | null>(null)

function syncRequestedTabFromRoute() {
  const tabParam = route.query.tab
  requestedTab.value = typeof tabParam === 'string' ? tabParam : null
}

function onTabClick(tabKey: string) {
  if (activeTab.value === tabKey) return
  activeTab.value = tabKey
  requestedTab.value = tabKey
  if (tabKey === 'main') {
    router.replace({ path: route.path, query: Object.fromEntries(Object.entries({ ...route.query }).filter(([k]) => k !== 'tab')) })
  } else {
    router.replace({ query: { ...route.query, tab: tabKey } })
  }
}

// Synchronise le tab actif avec l'URL et la disponibilité des tabs (metadata)
watch(
  () => tabs.value,
  () => {
    const tabList = tabs.value.map(t => t.key)
    // Si le tab demandé est disponible, l'activer
    if (requestedTab.value && tabList.includes(requestedTab.value)) {
      activeTab.value = requestedTab.value
    } else if (!tabList.includes(activeTab.value)) {
      // Si le tab actif n'existe plus (ex: metadata change), fallback sur main
      activeTab.value = 'main'
      requestedTab.value = 'main'
      router.replace({ path: route.path, query: Object.fromEntries(Object.entries({ ...route.query }).filter(([k]) => k !== 'tab')) })
    }
  },
  { immediate: true }
)

// Sur changement d'URL, mettre à jour le tab demandé
watch(
  () => route.query.tab,
  () => {
    syncRequestedTabFromRoute()
    // Si le tab demandé est dispo, l'activer
    const tabList = tabs.value.map(t => t.key)
    if (requestedTab.value && tabList.includes(requestedTab.value)) {
      activeTab.value = requestedTab.value
    } else if (!tabList.includes(activeTab.value)) {
      activeTab.value = 'main'
      requestedTab.value = 'main'
      router.replace({ path: route.path, query: Object.fromEntries(Object.entries({ ...route.query }).filter(([k]) => k !== 'tab')) })
    }
  }
)

// Sur changement de tab actif, synchroniser l'URL
watch(
  () => activeTab.value,
  (newTab) => {
    if (newTab === 'main' && 'tab' in route.query) {
      router.replace({ path: route.path, query: Object.fromEntries(Object.entries({ ...route.query }).filter(([k]) => k !== 'tab')) })
    } else if (route.query.tab !== newTab && newTab !== 'main') {
      router.replace({ query: { ...route.query, tab: newTab } })
    }
  }
)

onMounted(() => {
  syncRequestedTabFromRoute()
})

const eventId = Number(route.params.id)


const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')
const permissionLoading = ref(true)
const isReadOnly = computed(() => currentUserPermission.value === 1)
const isActionDisabled = computed(() => {
  return permissionLoading.value || isReadOnly.value || !isValidEventId(eventId)
})

const notification = ref({
  show: false,
  type: 'info',
  message: '',
  description: '',
  duration: 4000
})
function showNotif(type: 'success' | 'error' | 'info' | 'warning', message: string, description = '') {
  notification.value = { show: true, type, message, description, duration: 4000 }
}

const mainForm = ref({
  title: '',
  description: '',
  type: '',
  promoters: [] as Promoter[],
  venues: [] as Venue[],
  genres: [] as { id: number; name: string }[],
  metadata: {
    timetable: false,
    ticket_link: '',
    sway_tickets: false
  } as Record<string, any>
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

const genreSearch = ref('')
const genreResults = ref<{ id: number, name: string }[]>([])
const selectedGenres = ref<{ id: number, name: string }[]>([])
const showGenreModal = ref(false)

// --- STAGES STATE ---
function normalizeStages(val: any): Array<{ name: string }> {
  if (Array.isArray(val)) {
    return val.map(s => typeof s === 'string' ? { name: s } : s)
  }
  return []
}
const stages = ref<Array<{ name: string }>>(normalizeStages(mainForm.value.metadata.stages));
watch(() => mainForm.value.metadata.stages, (val) => {
  stages.value = normalizeStages(val);
});
function openAddStageModal() {
  stageForm.value = { name: '' };
  editStageIndex.value = null;
  addStageModalOpen.value = true;
  stageFormError.value = '';
}
function editStage(idx: number) {
  stageForm.value = { ...stages.value[idx] };
  editStageIndex.value = idx;
  addStageModalOpen.value = true;
  stageFormError.value = '';
}
function removeStage(idx: number) {
  stages.value.splice(idx, 1);
  mainForm.value.metadata.stages = [...stages.value];
}
const stagesLoading = ref(false)
function saveStages() {
  if (isActionDisabled.value) return
  stagesLoading.value = true
  supabase.from('events').update({ metadata: { ...mainForm.value.metadata, stages: stages.value } }).eq('id', eventId)
    .then(({ error }) => {
      if (error) {
        notification.value = { show: true, type: 'error', message: 'Erreur lors de la sauvegarde des stages', description: error.message, duration: 4000 }
      } else {
        notification.value = { show: true, type: 'success', message: 'Stages enregistrés avec succès', description: '', duration: 4000 }
        fetchEvent()
      }
    })
    .catch((e) => {
      notification.value = { show: true, type: 'error', message: 'Erreur inattendue', description: e?.message || '', duration: 4000 }
    })
    .finally(() => {
      stagesLoading.value = false
    })
}
const addStageModalOpen = ref(false);
const editStageIndex = ref<number | null>(null);
const stageForm = ref({ name: '' });
const stageFormError = ref('');
// --- STAGES STATE ---
function saveStage() {
  if (!stageForm.value.name.trim()) {
    stageFormError.value = 'Stage name is required.';
    return;
  }
  if (editStageIndex.value !== null) {
    stages.value[editStageIndex.value] = { ...stageForm.value };
  } else {
    stages.value.push({ ...stageForm.value });
  }
  mainForm.value.metadata.stages = [...stages.value];
  addStageModalOpen.value = false;
  stageFormError.value = '';
}

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

// Genres (multi-select)
function openGenreModal() {
  if (isActionDisabled.value) return
  genreSearch.value = ''
  genreResults.value = []
  selectedGenres.value = []
  showGenreModal.value = true
  searchGenres()
}
function closeGenreModal() { showGenreModal.value = false }
async function searchGenres() {
  const { data: genres } = await supabase
    .from('genres')
    .select('id, name')
  genreResults.value = (genres || [])
    .filter((g: { id: number; name: string }) => !mainForm.value.genres.some(mg => mg.id === g.id) && (!genreSearch.value || g.name.toLowerCase().includes(genreSearch.value.toLowerCase())))
    .slice(0, 8)
}
async function saveSelectedGenres() {
  if (isActionDisabled.value) return
  for (const genre of selectedGenres.value) {
    if (!mainForm.value.genres.some((g) => g.id === genre.id)) {
      // Ajout côté UI
      mainForm.value.genres.push(genre)
      // Ajout côté DB
      await (supabase.from('event_genre') as any).insert({ event_id: eventId, genre_id: genre.id })
    }
  }
  closeGenreModal()
}
async function removeGenre(id: number) {
  if (isActionDisabled.value) return
  mainForm.value.genres = mainForm.value.genres.filter(g => g.id !== id)
  await supabase.from('event_genre').delete().eq('event_id', eventId).eq('genre_id', id)
}

// Dates tab
const datesForm = ref({
  startDate: '',
  startHour: 0,
  startMinute: 0,
  endDate: '',
  endHour: 0,
  endMinute: 0,
  noEndDate: false
})
const datesLoading = ref(false)

const userIdInt = ref<number | null>(null)
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
    mainForm.value.description = (data as any).description || ''
    mainForm.value.type = (data as any).type || ''
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
    // Genres liés à l'event
    const { data: eventGenres } = await supabase
      .from('event_genre')
      .select('genre_id, genres(name)')
      .eq('event_id', eventId)
    mainForm.value.genres = ((eventGenres || []) as any[]).map((eg: any) => ({ id: eg.genre_id, name: eg.genres?.name }))
    // Dates
    if ((data as any).date_time) {
      const start = new Date((data as any).date_time)
      datesForm.value.startDate = start.toISOString().slice(0, 10)
      datesForm.value.startHour = start.getHours()
      datesForm.value.startMinute = start.getMinutes()
    }
    if ((data as any).end_date_time) {
      const end = new Date((data as any).end_date_time)
      datesForm.value.endDate = end.toISOString().slice(0, 10)
      datesForm.value.endHour = end.getHours()
      datesForm.value.endMinute = end.getMinutes()
    }
    // Charger metadata
    try {
      // Merge les metadata existantes avec les valeurs par défaut pour garantir la présence des clés attendues
      const defaultMeta = { timetable: false, ticket_link: '', sway_tickets: false }
      let loadedMeta: any = {}
      if (typeof data.metadata === 'string') {
        try {
          loadedMeta = JSON.parse(data.metadata)
        } catch (e) {
          console.log('[DEBUG] Erreur parsing metadata:', e)
          loadedMeta = {}
        }
      } else if (typeof data.metadata === 'object' && data.metadata !== null) {
        loadedMeta = data.metadata
      } else {
        loadedMeta = {}
      }
      // Correction : forcer timetable à Boolean (pour la réactivité Vue)
      if (typeof loadedMeta.timetable !== 'undefined') {
        loadedMeta.timetable = Boolean(loadedMeta.timetable)
      }
      mainForm.value.metadata = { ...defaultMeta, ...loadedMeta }
      // DEBUG LOG: Affiche les metadata chargés (pour debug toggles)
      console.log('[DEBUG] Metadata loaded (final):', JSON.stringify(mainForm.value.metadata))
    } catch (err) {
      mainForm.value.metadata = { timetable: false, ticket_link: '', sway_tickets: false }
      // DEBUG LOG: Erreur lors du chargement des metadata
      console.log('[DEBUG] Metadata load failed, fallback to defaults', err)
    }
    // DEBUG LOG: Etat des toggles après chargement
    console.log('[DEBUG] Timetable toggle:', mainForm.value.metadata.timetable, '| Sway Tickets toggle:', mainForm.value.metadata.sway_tickets)
    // DEBUG LOG: festival_days (onglet Day)
    if (mainForm.value.metadata.festival_days) {
      console.log('[DEBUG] festival_days loaded:', JSON.stringify(mainForm.value.metadata.festival_days))
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
    .in('permission_level', [1, 2, 3])
  const promoterIds = (perms || []).map((p: { entity_id: number }) => p.entity_id)
  const { data: proms } = await supabase
    .from('promoters')
    .select('id, name')
    .in('id', promoterIds)
  promoterResults.value = (proms || [])
    .filter((p: Promoter) => !mainForm.value.promoters.some(mp => mp.id === p.id) && (!promoterSearch.value || p.name.toLowerCase().includes(promoterSearch.value.toLowerCase())))
    .slice(0, 5)
}

async function searchVenues() {
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
  venueResults.value = (venues || [])
    .filter((v: Venue) => !mainForm.value.venues.some(mv => mv.id === v.id) && (!venueSearch.value || v.name.toLowerCase().includes(venueSearch.value.toLowerCase())))
    .slice(0, 5)
}

onMounted(async () => {
  permissionLoading.value = true
  await fetchPermission()
  permissionLoading.value = false
  await fetchUserInternalId()
  await fetchUserPromoterIds()
  await fetchEvent()
  await fetchAllPromoters()

  console.log('[PAGE] settings.vue mounted, route:', route.path)
})

// Helper pour valider l'eventId
function isValidEventId(id: any) {
  if (typeof id === 'number') return Number.isInteger(id) && id > 0
  if (typeof id === 'string') return /^\d+$/.test(id) && Number(id) > 0
  return false
}

// SAVE MAIN
async function saveMain() {
  if (isReadOnly.value) return;
  mainLoading.value = true
  // Vérifie que l'eventId est bien défini et valide
  if (!isValidEventId(eventId)) {

    console.error('[ERROR] saveMain appelé avec eventId invalide:', eventId)
    showNotif('error', "Impossible de sauvegarder : eventId invalide.")
    mainLoading.value = false
    return
  }
  // On part du metadata complet chargé dans mainForm (qui contient toutes les clés, même inconnues de l'UI)
  const fullMeta = { ...mainForm.value.metadata }
  // Les champs édités dans l'UI sont déjà à jour dans mainForm.value.metadata
  // DEBUG LOG: Affiche les metadata à sauvegarder (pour debug toggles)
  console.log('[DEBUG] Metadata to be saved:', JSON.stringify(fullMeta))
  // DEBUG LOG: Etat des toggles au moment de la sauvegarde
  console.log('[DEBUG] Timetable toggle (save):', fullMeta.timetable, '| Sway Tickets toggle (save):', fullMeta.sway_tickets)
  // DEBUG LOG: festival_days (onglet Day) au moment de la sauvegarde
  if (fullMeta.festival_days) {
    console.log('[DEBUG] festival_days to be saved:', JSON.stringify(fullMeta.festival_days))
  }
  const { error: err1 } = await (supabase.from('events') as any)
    .update({ title: mainForm.value.title, description: mainForm.value.description, type: mainForm.value.type, metadata: fullMeta })
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
  // Update event_genre
  const { data: currentGenres } = await supabase
    .from('event_genre')
    .select('genre_id')
    .eq('event_id', eventId)
  const toAddGenres = mainForm.value.genres.filter(g => !(currentGenres as any[])?.some((cg: any) => cg.genre_id === g.id))
  const toRemoveGenres = (currentGenres as any[])?.filter((cg: any) => !mainForm.value.genres.some(g => g.id === cg.genre_id)) || []
  for (const g of toAddGenres) {
    await (supabase.from('event_genre') as any).insert({ event_id: eventId, genre_id: g.id })
  }
  for (const g of toRemoveGenres) {
    await (supabase.from('event_genre') as any).delete().eq('event_id', eventId).eq('genre_id', g.genre_id)
  }
  if (err1) {
    showNotif('error', "Erreur lors de l'enregistrement", err1?.message)
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
  const start = new Date(`${datesForm.value.startDate}T${String(datesForm.value.startHour).padStart(2, '0')}:${String(datesForm.value.startMinute).padStart(2, '0')}:00`)
  const end = new Date(`${datesForm.value.endDate}T${String(datesForm.value.endHour).padStart(2, '0')}:${String(datesForm.value.endMinute).padStart(2, '0')}:00`)
  // Toujours synchroniser la dernière version de festivalDays dans metadata avant save
  mainForm.value.metadata.festival_days = [...festivalDays.value]
  const { error } = await supabase
    .from('events')
    .update({ date_time: start.toISOString(), end_date_time: end.toISOString(), metadata: { ...mainForm.value.metadata } })
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
    .in('permission_level', [1, 2, 3])
  userPromoterIds.value = (perms || []).map((p: { entity_id: number }) => p.entity_id)
}

// Format affichage HH:MM toujours 2 chiffres
function pad2(n: number) { return n.toString().padStart(2, '0') }
function onHourChange(field: 'startHour' | 'endHour') {
  if (datesForm.value[field] > 23) datesForm.value[field] = 0
  if (datesForm.value[field] < 0) datesForm.value[field] = 23
}
function onMinuteChange(field: 'startMinute' | 'endMinute') {
  if (datesForm.value[field] > 59) datesForm.value[field] = 0
  if (datesForm.value[field] < 0) datesForm.value[field] = 59
}
function onHourBlur(field: 'startHour' | 'endHour') {
  datesForm.value[field] = Number(pad2(datesForm.value[field]))
}
function onMinuteBlur(field: 'startMinute' | 'endMinute') {
  datesForm.value[field] = Number(pad2(datesForm.value[field]))
}

onMounted(async () => {
  await fetchPermission()
  await fetchUserInternalId()
  await fetchUserPromoterIds()
  await fetchEvent()
  await fetchAllPromoters()


  // console.log('[PAGE] settings.vue mounted, route:', route.path)
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
  return allowedPromoters.value.filter(p => p.stripe_account_id !== event.value?.promoter_stripe_account_id)
})

const hoverTicketLink = ref(false)
const previousTicketLink = ref<string | null>(null)

// Génère dynamiquement le lien Sway Tickets avec priorité : PROD_BASE_URL > TEST_BASE_URL > BASE_URL > window.location.origin > https://sway.events
function getSwayTicketsUrl() {
  const prod = config.public?.PROD_BASE_URL
  const test = config.public?.TEST_BASE_URL
  const base = config.public?.BASE_URL
  let urlBase = prod || test || base
  if (!urlBase && typeof window !== 'undefined') urlBase = window.location.origin
  if (!urlBase) urlBase = 'https://sway.events'
  return `${urlBase.replace(/\/$/, '')}/event/${eventId}`
}

// Quand Sway Tickets est activé, force le lien dans le champ ticket_link, sinon restaure l'ancien lien
watch(() => mainForm.value.metadata.sway_tickets, (val, oldVal) => {
  if (val) {
    previousTicketLink.value = mainForm.value.metadata.ticket_link
    mainForm.value.metadata.ticket_link = getSwayTicketsUrl()
  } else {
    // Si on avait un ancien lien avant l'activation, on le restaure
    if (previousTicketLink.value !== null) {
      mainForm.value.metadata.ticket_link = previousTicketLink.value
      previousTicketLink.value = null
    }
  }
})

function copySwayTicketsUrl() {
  const url = getSwayTicketsUrl()
  navigator.clipboard.writeText(url)
    .then(() => showNotif('success', 'Lien copié dans le presse-papier'))
    .catch(() => showNotif('error', 'Erreur lors de la copie du lien'))
}

function copyTicketLink() {
  const url = mainForm.value.metadata.ticket_link
  if (url) {
    navigator.clipboard.writeText(url)
      .then(() => showNotif('success', 'Lien copié dans le presse-papier'))
      .catch(() => showNotif('error', 'Erreur lors de la copie du lien'))
  }
}

// Onglet Dates : remplacer la checkbox par un bouton croix pour clear la date de fin
function clearEndDate() {
  datesForm.value.endDate = ''
  datesForm.value.endHour = 0
  datesForm.value.endMinute = 0
}

// Gestion des jours (CRUD, drag & drop, modale)
const festivalDays = ref<Array<{ name: string; start: string; end: string }>>(mainForm.value.metadata.festival_days || [])
// Synchronisation descendante : metadata -> festivalDays
watch(() => mainForm.value.metadata.festival_days, (val) => {
  if (Array.isArray(val)) festivalDays.value = [...val]
})

const addDayModalOpen = ref(false)
const editDayIndex = ref<number | null>(null)
const dayForm = ref({ name: '', start: '', end: '' })
const dayFormError = ref('')

function openAddDayModal() {
  dayForm.value = { name: '', start: '', end: '' }
  editDayIndex.value = null
  addDayModalOpen.value = true
  dayFormError.value = ''
}
function editDay(idx: number) {
  const d = festivalDays.value[idx]
  // Convert ISO string to 'YYYY-MM-DDTHH:mm' for datetime-local input
  function toInputValue(dt: string) {
    if (!dt) return ''
    const date = new Date(dt)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  dayForm.value = {
    name: d.name,
    start: toInputValue(d.start),
    end: toInputValue(d.end)
  }
  editDayIndex.value = idx
  addDayModalOpen.value = true
  dayFormError.value = ''
}
function removeDay(idx: number) {
  festivalDays.value.splice(idx, 1)
  mainForm.value.metadata.festival_days = [...festivalDays.value]
}
function saveDay() {
  // Validation
  if (!dayForm.value.name.trim()) {
    dayFormError.value = 'Day name is required.'
    return
  }
  if (!dayForm.value.start || !dayForm.value.end) {
    dayFormError.value = 'Start and end are required.'
    return
  }
  const eventStart = new Date(`${datesForm.value.startDate}T${String(datesForm.value.startHour).padStart(2, '0')}:${String(datesForm.value.startMinute).padStart(2, '0')}:00`)
  const eventEnd = new Date(`${datesForm.value.endDate}T${String(datesForm.value.endHour).padStart(2, '0')}:${String(datesForm.value.endMinute).padStart(2, '0')}:00`)
  const dStart = new Date(dayForm.value.start)
  const dEnd = new Date(dayForm.value.end)
  if (dStart < eventStart || dEnd > eventEnd) {
    dayFormError.value = 'Day start/end must be within event bounds.'
    return
  }
  if (dStart >= dEnd) {
    dayFormError.value = 'La date/heure de début doit être antérieure à la date/heure de fin.'
    return
  }
  if (editDayIndex.value !== null) {
    festivalDays.value[editDayIndex.value] = { ...dayForm.value }
  } else {
    festivalDays.value.push({ ...dayForm.value })
  }
  // Synchronise metadata après modification
  mainForm.value.metadata.festival_days = [...festivalDays.value]
  addDayModalOpen.value = false
}
function formatDayDate(dt: string) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleString()
}
</script>

<style scoped>
.tabs {
  /* daisyUI tabs already styled, juste spacing */
}

.modal {
  z-index: 50;
}
</style>