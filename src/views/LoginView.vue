<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const email = ref('admin@modulos.com');
const password = ref('');
const error = ref('');
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push('/');
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudo iniciar sesión';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="card login-card" @submit.prevent="submit">
      <div class="brand">📱 Módulos</div>
      <p class="muted">Panel de administración</p>

      <div class="field">
        <label>Email</label>
        <input v-model="email" type="email" required autocomplete="email" />
      </div>
      <div class="field">
        <label>Contraseña</label>
        <input v-model="password" type="password" required autocomplete="current-password" />
      </div>

      <button class="btn btn-primary" style="width:100%" type="submit" :disabled="loading">
        {{ loading ? 'Ingresando...' : 'Ingresar' }}
      </button>
      <p v-if="error" class="error-text">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4f46e5, #171a23);
}
.login-card { width: 340px; }
.brand { font-size: 20px; font-weight: 800; }
</style>
