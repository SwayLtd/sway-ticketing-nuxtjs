<!-- layouts/admin-event.vue -->
<template>
    <div class="admin-event-layout">
      <aside class="admin-event-menu">
        <nav>
          <ul>
            <li :class="{ active: isActive(`/admin/event/${eventId}`) }">
              <NuxtLink :to="`/admin/event/${eventId}`" class="main-dashboard">
                Main dashboard
              </NuxtLink>
            </li>
            <li :class="{ active: isActive(`/admin/event/${eventId}/settings`) }">
              <NuxtLink :to="`/admin/event/${eventId}/settings`">Settings</NuxtLink>
            </li>
            <li :class="{ active: isActive(`/admin/event/${eventId}/tickets`) }">
              <NuxtLink :to="`/admin/event/${eventId}/tickets`">Tickets</NuxtLink>
            </li>
            <li :class="{ active: isActive(`/admin/event/${eventId}/orders`) }">
              <NuxtLink :to="`/admin/event/${eventId}/orders`">Orders</NuxtLink>
            </li>
            <li class="disabled">
              <span>Insights</span>
            </li>
            <li :class="{ active: isActive(`/admin/event/${eventId}/scanners`) }">
              <NuxtLink :to="`/admin/event/${eventId}/scanners`">Scanners</NuxtLink>
            </li>
            <li :class="{ active: isActive(`/admin/event/${eventId}/permissions`) }">
              <NuxtLink :to="`/admin/event/${eventId}/permissions`">Permissions</NuxtLink>
            </li>
          </ul>
        </nav>
      </aside>
      <main class="admin-event-content">
        <NuxtPage />
      </main>
    </div>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router'
  
  const route = useRoute()
  // On suppose que l'ID de l'événement est passé dans l'URL en tant que paramètre "id"
  const eventId = route.params.id || ''
  
  // Fonction simple pour déterminer si la route actuelle correspond exactement au chemin attendu
  const isActive = (path) => route.path === path
  </script>
  
  <style scoped>
  .admin-event-layout {
    display: flex;
    min-height: 100vh;
    font-family: sans-serif;
  }
  
  .admin-event-menu {
    width: 250px;
    background-color: #2d2d2d;
    padding: 1rem;
    color: #fff;
  }
  
  .admin-event-menu ul {
    list-style: none;
    padding: 0;
  }
  
  .admin-event-menu li {
    margin-bottom: 1rem;
  }
  
  .admin-event-menu a {
    text-decoration: none;
    color: #fff;
    display: block;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background 0.3s;
  }
  
  .admin-event-menu li.active a {
    background-color: #6772e5;
    font-weight: bold;
  }
  
  .admin-event-menu li.disabled span {
    color: #aaa;
    display: block;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: not-allowed;
  }
  
  .admin-event-menu .main-dashboard {
    font-size: 1.1em;
    font-weight: bold;
    background-color: #414141;
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .admin-event-content {
    flex: 1;
    padding: 2rem;
    background-color: #f7f7f7;
  }
  </style>
  