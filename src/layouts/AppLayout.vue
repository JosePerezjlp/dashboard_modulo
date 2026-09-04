<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">📱 Módulos</div>
      <nav>
        <router-link to="/" exact-active-class="active">Inicio</router-link>
        <router-link to="/pedidos" active-class="active">Pedidos</router-link>
        <router-link to="/productos" active-class="active">Productos</router-link>
        <router-link to="/estadisticas" active-class="active">Estadísticas</router-link>
        <router-link v-if="auth.isAdmin" to="/configuracion" active-class="active">Configuración</router-link>
      </nav>
      <div class="user-box">
        <div class="user-name">{{ auth.user?.name }}</div>
        <div class="user-role muted">{{ auth.user?.role }}</div>
        <button class="btn btn-secondary btn-sm mt-16" @click="logout">Cerrar sesión</button>
      </div>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 230px;
  background: #171a23;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.brand { font-size: 18px; font-weight: 800; margin-bottom: 28px; }
nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
nav a {
  padding: 10px 12px;
  border-radius: 8px;
  color: #c6c9d6;
  font-size: 14px;
  font-weight: 600;
}
nav a:hover { background: #232734; color: #fff; }
nav a.active { background: #4f46e5; color: #fff; }
.user-box { border-top: 1px solid #2a2e3b; padding-top: 16px; }
.user-name { font-weight: 700; font-size: 14px; }
.user-role { font-size: 12px; text-transform: capitalize; }
.content { flex: 1; padding: 32px; max-width: 1400px; }
</style>
