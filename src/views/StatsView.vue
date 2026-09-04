<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import api from '../lib/api';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const topProducts = ref<any[]>([]);
const monthly = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  const [top, sales] = await Promise.all([
    api.get('/stats/top-products', { params: { limit: 8 } }),
    api.get('/stats/monthly-sales', { params: { months: 6 } }),
  ]);
  topProducts.value = top.data;
  monthly.value = sales.data;
  buildChart();
  loading.value = false;
}
onMounted(load);

function money(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(v));
}

const monthlyChartData = ref<any>({ labels: [], datasets: [] });
const chartOptions = { responsive: true, plugins: { legend: { display: false } } };

function buildChart() {
  monthlyChartData.value = {
    labels: monthly.value.map((m) => m.month),
    datasets: [
      {
        label: 'Ingresos',
        backgroundColor: '#4f46e5',
        data: monthly.value.map((m) => m.revenue),
      },
    ],
  };
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Estadísticas</h1>
        <p>Ventas, productos más vendidos y ganancias</p>
      </div>
    </div>

    <div v-if="loading" class="muted">Cargando...</div>

    <template v-else>
      <div class="card mb-16">
        <h3 style="margin-top:0">Ingresos por mes</h3>
        <Bar v-if="monthly.length" :data="monthlyChartData" :options="chartOptions" />
        <p v-else class="muted">Aún no hay ventas confirmadas.</p>
        <table class="mt-16">
          <thead><tr><th>Mes</th><th>Pedidos</th><th>Unidades</th><th>Ingresos</th></tr></thead>
          <tbody>
            <tr v-for="m in monthly" :key="m.month">
              <td>{{ m.month }}</td>
              <td>{{ m.orders }}</td>
              <td>{{ m.units }}</td>
              <td>{{ money(m.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3 style="margin-top:0">Productos más vendidos</h3>
        <table>
          <thead><tr><th>Producto</th><th>Unidades vendidas</th><th>Ingresos generados</th></tr></thead>
          <tbody>
            <tr v-if="!topProducts.length"><td colspan="3" class="muted">Aún no hay ventas confirmadas.</td></tr>
            <tr v-for="t in topProducts" :key="t.product?.id">
              <td>{{ t.product?.name ?? 'Producto eliminado' }}</td>
              <td>{{ t.quantitySold }}</td>
              <td>{{ money(t.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
