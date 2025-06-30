<template>
    <div class="message-container">
        <img src="/images/sway-app.png" alt="Sway Logo" class="logo" />
        <h2>Email Change Confirmation</h2>
        <div id="message" class="initial-message">
            <template v-if="type === 'email_change'">
                <p class="success">Your email address has been successfully updated!</p>
                <p>You can now continue using the app with your new email.</p>
            </template>
            <template v-else>
                <p class="error">Invalid request.</p>
                <p>Please contact support if you believe this is an error.</p>
            </template>
        </div>
        <button class="redirect-button" @click="redirectToApp">Open App</button>
    </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const type = route.query.type as string || ''
const accessToken = route.query.access_token as string || ''

function redirectToApp() {
    const deepLinkUrl = `app.sway.main://login-callback?token=${encodeURIComponent(accessToken)}`
    window.location.href = deepLinkUrl
}
</script>

<style scoped>
body,
html {
    margin: 0;
    padding: 0;
    height: 100%;
    background-color: #f5f5f5;
    font-family: Arial, sans-serif;
}

.message-container {
    background-color: #fff;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 500px;
    width: 95%;
    margin: 60px auto;
}

.message-container h2 {
    margin-bottom: 20px;
    color: #333;
}

.message-container p {
    margin-bottom: 30px;
    color: #555;
    line-height: 1.6;
}

.logo {
    width: 100px;
    height: 100px;
    margin-bottom: 20px;
    display: block;
    margin-left: auto;
    margin-right: auto;
}

.success {
    color: #28a745;
    font-weight: bold;
}

.error {
    color: #d32f2f;
    font-weight: bold;
}

.redirect-button {
    background-color: #007bff;
    color: #fff;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    text-decoration: none;
    display: inline-block;
    transition: background-color 0.3s ease;
}

.redirect-button:hover {
    background-color: #0056b3;
}

.initial-message {
    color: #666;
    margin-bottom: 20px;
}
</style>
