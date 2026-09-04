<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../lib/api';

const overview = ref<any>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  const { data } = await api.get('/stats/overview');
  overview.value = data;
  loading.value = false;
}

onMounted(load);

function money(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(v));
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Inicio</h1>
        <p>Resumen general del negocio</p>
      </div>
    </div>

    <div v-if="loading" class="muted">Cargando...</div>

    <template v-else-if="overview">
      <div class="grid grid-4 mb-16">
        <div class="card">
          <div class="muted">Pendientes de pago</div>
          <div class="stat">{{ overview.orders.pendientePago }}</div>
        </div>
        <div class="card">
          <div class="muted">Pago confirmado</div>
          <div class="stat">{{ overview.orders.pagoConfirmado }}</div>
        </div>
        <div class="card">
          <div class="muted">En preparación</div>
          <div class="stat">{{ overview.orders.enPreparacion }}</div>
        </div>
        <div class="card">
          <div class="muted">Completados</div>
          <div class="stat">{{ overview.orders.completado }}</div>
        </div>
      </div>

      <div class="grid grid-2 mb-16">
        <div class="card">
          <div class="muted">Ingresos totales (pedidos pagados)</div>
          <div class="stat">{{ money(overview.revenue.total) }}</div>
          <div class="muted mt-16">{{ overview.revenue.ordersCount }} pedidos vendidos</div>
        </div>
        <div class="card">
          <div class="muted flex gap-8">
            Productos con stock bajo
            <span v-if="overview.lowStockCount" class="badge badge-danger">{{ overview.lowStockCount }}</span>
          </div>
          <ul v-if="overview.lowStockProducts.length" class="low-stock-list">
            <li v-for="p in overview.lowStockProducts" :key="p.id">
              <router-link :to="`/productos/${p.id}`">{{ p.name }}</router-link>
              <span class="badge badge-warning">{{ p.stock }} / mín {{ p.minStock }}</span>
            </li>
          </ul>
          <p v-else class="muted mt-16">Todo el stock está en niveles saludables ✅</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat { font-size: 28px; font-weight: 800; margin-top: 6px; }
.low-stock-list { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 8px; }
.low-stock-list li { display: flex; justify-content: space-between; align-items: center; }
</style>
