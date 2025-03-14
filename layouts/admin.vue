<template>
    <div class="admin-layout">
      <!-- Sidebar (Menu de navigation) -->
      <aside class="sidebar">
        <nav>
          <ul>
            <li :class="{ active: isActive('/admin') }">
              <NuxtLink to="/admin">Dashboard</NuxtLink>
            </li>
            <li :class="{ active: isActive('/admin/manage') }">
              <NuxtLink to="/admin/manage">Manage entities</NuxtLink>
            </li>
          </ul>
        </nav>
      </aside>
  
      <!-- Contenu principal -->
      <main class="content">
        <slot />
      </main>
    </div>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router'
  
  const route = useRoute()
  
  // Vérifier si la route actuelle correspond à un chemin spécifique
  const isActive = (path) => {
    return route.path === path
  }
  </script>
  
  <style scoped>
  .admin-layout {
    display: flex;
    height: 100vh;
  }
  
  .sidebar {
    width: 200px;
    background-color: #1e1e2e;
    padding: 1rem;
  }
  
  nav ul {
    list-style: none;
    padding: 0;
  }
  
  nav li {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    transition: background 0.3s;
  }
  
  nav li a {
    text-decoration: none;
    color: white;
    display: block;
  }
  
  nav li.active {
    background-color: #6772e5;
    font-weight: bold;
  }
  
  nav li:hover {
    background-color: #414166;
  }
  
  .content {
    flex: 1;
    padding: 2rem;
  }
  </style>
  