<template>
    <div class="auth-callback-bg">
        <div class="loader"></div>
        <p class="loading-text">Processing your request...</p>
        <p class="message">If you are not redirected automatically, please wait or contact support.</p>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

onMounted(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const type = params.get('type')
    const accessToken = params.get('access_token') || ''

    if (type === 'email_change') {
        window.location.href = `/email-confirmation?type=email_change&access_token=${encodeURIComponent(accessToken)}`
    } else {
        window.location.href = '/'
    }
})
</script>

<style scoped>
.auth-callback-bg {
    min-height: 100vh;
    background: #fff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: Arial, sans-serif;
}

.loader {
    width: 100px;
    height: 100px;
    background-image: url('/images/sway-app.png');
    background-size: contain;
    background-repeat: no-repeat;
    animation: rotate 2s linear infinite;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    margin-top: 20px;
    font-size: 1.5em;
    color: #333;
}

.message {
    margin-top: 30px;
    font-size: 1em;
    color: #666;
    text-align: center;
    max-width: 100%;
}
</style>
