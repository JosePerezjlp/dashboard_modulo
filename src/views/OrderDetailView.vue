<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../lib/api';

const route = useRoute();
const order = ref<any>(null);
const loading = ref(true);
const acting = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  const { data } = await api.get(`/orders/${route.params.id}`);
  order.value = data;
  loading.value = false;
}
onMounted(load);

const nextActions = computed(() => {
  if (!order.value) return [];
  const map: Record<string, { status: string; label: string; cls: string }[]> = {
    PENDIENTE_PAGO: [
      { status: 'PAGO_CONFIRMADO', label: '✅ Confirmar pago recibido', cls: 'btn-success' },
      { status: 'CANCELADO', label: 'Cancelar pedido', cls: 'btn-danger' },
    ],
    PAGO_CONFIRMADO: [
      { status: 'EN_PREPARACION', label: '📦 Comenzar preparación', cls: 'btn-primary' },
      { status: 'CANCELADO', label: 'Cancelar pedido', cls: 'btn-danger' },
    ],
    EN_PREPARACION: [
      { status: 'COMPLETADO', label: '🚀 Marcar como completado', cls: 'btn-success' },
      { status: 'CANCELADO', label: 'Cancelar pedido', cls: 'btn-danger' },
    ],
  };
  return map[order.value.status] ?? [];
});

async function changeStatus(status: string) {
  if (status === 'CANCELADO' && !confirm('¿Cancelar el pedido? El stock reservado se devolverá.')) return;
  acting.value = true;
  error.value = '';
  try {
    await api.patch(`/orders/${order.value.id}/status`, { status });
    await load();
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudo actualizar el estado';
  } finally {
    acting.value = false;
  }
}

function money(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(v));
}

function statusLabel(s: string) {
  return (
    {
      PENDIENTE_PAGO: 'Pendiente de pago',
      PAGO_CONFIRMADO: 'Pago confirmado',
      EN_PREPARACION: 'En preparación',
      COMPLETADO: 'Completado',
      CANCELADO: 'Cancelado',
      VENCIDO: 'Vencido (sin pago a tiempo)',
    } as Record<string, string>
  )[s];
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 v-if="order">Ticket {{ order.ticketNumber }}</h1>
        <p>Detalle del pedido</p>
      </div>
      <router-link class="btn btn-secondary" to="/pedidos">Volver</router-link>
    </div>

    <div v-if="loading" class="muted">Cargando...</div>

    <template v-else-if="order">
      <div class="grid grid-2 mb-16">
        <div class="card">
          <h3 style="margin-top:0">Cliente</h3>
          <p><strong>{{ order.customerName }}</strong></p>
          <p class="muted">Tel: {{ order.customerPhone }}</p>
          <p v-if="order.customerEmail" class="muted">Email: {{ order.customerEmail }}</p>
          <p v-if="order.customerNote" class="muted">Nota: {{ order.customerNote }}</p>
        </div>
        <div class="card">
          <h3 style="margin-top:0">Estado</h3>
          <span class="badge badge-info" style="font-size:14px">{{ statusLabel(order.status) }}</span>
          <p class="muted mt-16">Creado: {{ new Date(order.createdAt).toLocaleString('es-AR') }}</p>
          <p v-if="order.status === 'PENDIENTE_PAGO'" class="muted">
            Vence: {{ new Date(order.expiresAt).toLocaleString('es-AR') }}
          </p>
          <p v-if="order.paidConfirmedAt" class="muted">
            Pago confirmado: {{ new Date(order.paidConfirmedAt).toLocaleString('es-AR') }}
          </p>
        </div>
      </div>

      <div class="card mb-16">
        <h3 style="margin-top:0">Datos de transferencia (mostrados al cliente)</h3>
        <p class="muted">CBU: <strong>{{ order.bankCbu }}</strong></p>
        <p v-if="order.bankAlias" class="muted">Alias: <strong>{{ order.bankAlias }}</strong></p>
        <p class="muted">Titular: <strong>{{ order.bankHolder }}</strong></p>
      </div>

      <div class="card mb-16" style="padding:0; overflow-x:auto;">
        <table>
          <thead>
            <tr><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            <tr v-for="i in order.items" :key="i.id">
              <td>{{ i.productName }}</td>
              <td>{{ i.quantity }}</td>
              <td>{{ money(i.unitPrice) }}</td>
              <td>{{ money(i.subtotal) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td colspan="3" class="text-right"><strong>Total a transferir</strong></td><td><strong>{{ money(order.total) }}</strong></td></tr>
          </tfoot>
        </table>
      </div>

      <div class="card" v-if="nextActions.length">
        <h3 style="margin-top:0">Acciones</h3>
        <div class="flex gap-8">
          <button
            v-for="a in nextActions"
            :key="a.status"
            class="btn"
            :class="a.cls"
            :disabled="acting"
            @click="changeStatus(a.status)"
          >
            {{ a.label }}
          </button>
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
      </div>
    </template>
  </div>
</template>
