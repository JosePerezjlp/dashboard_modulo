<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../lib/api';

const orders = ref<any[]>([]);
const status = ref('');
const search = ref('');
const loading = ref(true);

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE_PAGO', label: 'Pendiente de pago' },
  { value: 'PAGO_CONFIRMADO', label: 'Pago confirmado' },
  { value: 'EN_PREPARACION', label: 'En preparación' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'VENCIDO', label: 'Vencido' },
];

async function load() {
  loading.value = true;
  const { data } = await api.get('/orders', {
    params: { status: status.value || undefined, search: search.value || undefined },
  });
  orders.value = data;
  loading.value = false;
}

onMounted(load);

function money(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(v));
}

function statusBadge(s: string) {
  return (
    {
      PENDIENTE_PAGO: 'badge-warning',
      PAGO_CONFIRMADO: 'badge-info',
      EN_PREPARACION: 'badge-info',
      COMPLETADO: 'badge-success',
      CANCELADO: 'badge-muted',
      VENCIDO: 'badge-danger',
    } as Record<string, string>
  )[s];
}

function statusLabel(s: string) {
  return statusOptions.find((o) => o.value === s)?.label ?? s;
}

function timeLeft(order: any) {
  if (order.status !== 'PENDIENTE_PAGO') return null;
  const ms = new Date(order.expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Vencido';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m restantes`;
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Pedidos</h1>
        <p>Tickets generados desde la tienda online</p>
      </div>
    </div>

    <div class="card mb-16">
      <div class="flex gap-12" style="flex-wrap: wrap;">
        <select v-model="status" style="max-width: 220px" @change="load">
          <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <input v-model="search" placeholder="Buscar por ticket o cliente..." style="max-width: 280px" @keyup.enter="load" />
        <button class="btn btn-secondary btn-sm" @click="load">Buscar</button>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Creado</th>
            <th>Vencimiento</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="muted">Cargando...</td></tr>
          <tr v-else-if="!orders.length"><td colspan="7" class="muted">No hay pedidos.</td></tr>
          <tr v-for="o in orders" :key="o.id">
            <td><router-link :to="`/pedidos/${o.id}`" style="font-weight:600">{{ o.ticketNumber }}</router-link></td>
            <td>{{ o.customerName }}<br /><span class="muted">{{ o.customerPhone }}</span></td>
            <td>{{ money(o.total) }}</td>
            <td><span class="badge" :class="statusBadge(o.status)">{{ statusLabel(o.status) }}</span></td>
            <td class="muted">{{ new Date(o.createdAt).toLocaleString('es-AR') }}</td>
            <td class="muted">{{ timeLeft(o) ?? '-' }}</td>
            <td class="text-right">
              <router-link class="btn btn-secondary btn-sm" :to="`/pedidos/${o.id}`">Ver</router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
