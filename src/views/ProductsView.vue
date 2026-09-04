<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../lib/api';

const products = ref<any[]>([]);
const search = ref('');
const lowStockOnly = ref(false);
const loading = ref(true);

async function load() {
  loading.value = true;
  const { data } = await api.get('/products', {
    params: {
      search: search.value || undefined,
      lowStock: lowStockOnly.value ? 'true' : undefined,
    },
  });
  products.value = data;
  loading.value = false;
}

onMounted(load);

function money(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(v));
}

function stockBadge(p: any) {
  if (p.stock <= p.minStock) return 'badge-danger';
  if (p.stock >= p.maxStock * 0.8) return 'badge-success';
  return 'badge-info';
}

async function toggleActive(p: any) {
  if (!confirm(`¿Desactivar "${p.name}"? Dejará de mostrarse en la tienda.`)) return;
  await api.delete(`/products/${p.id}`);
  load();
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Productos</h1>
        <p>Módulos de celulares publicados en la tienda</p>
      </div>
      <router-link class="btn btn-primary" to="/productos/nuevo">+ Nuevo producto</router-link>
    </div>

    <div class="card mb-16">
      <div class="flex gap-12" style="flex-wrap: wrap;">
        <input
          v-model="search"
          placeholder="Buscar por nombre, marca, modelo o SKU..."
          style="max-width: 320px"
          @keyup.enter="load"
        />
        <label class="flex gap-8" style="margin: 0; font-weight: 500; color: var(--text);">
          <input type="checkbox" v-model="lowStockOnly" style="width: auto" @change="load" />
          Solo stock bajo
        </label>
        <button class="btn btn-secondary btn-sm" @click="load">Buscar</button>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Marca / Modelo</th>
            <th>SKU</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="muted">Cargando...</td></tr>
          <tr v-else-if="!products.length"><td colspan="7" class="muted">No hay productos.</td></tr>
          <tr v-for="p in products" :key="p.id">
            <td>
              <router-link :to="`/productos/${p.id}`" class="flex gap-12">
                <img
                  v-if="p.images?.[0]"
                  :src="(p.images[0].url.startsWith('http') ? '' : (api.defaults.baseURL?.replace('/api','') ?? '')) + p.images[0].url"
                  class="thumb"
                />
                <div v-else class="thumb thumb-placeholder">📷</div>
                <span>{{ p.name }}</span>
              </router-link>
            </td>
            <td>{{ p.brand }} · {{ p.model }}</td>
            <td class="muted">{{ p.sku }}</td>
            <td>{{ money(p.price) }}</td>
            <td>
              <span class="badge" :class="stockBadge(p)">{{ p.stock }} (mín {{ p.minStock }} / máx {{ p.maxStock }})</span>
            </td>
            <td>
              <span class="badge" :class="p.active ? 'badge-success' : 'badge-muted'">
                {{ p.active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="text-right">
              <router-link class="btn btn-secondary btn-sm" :to="`/productos/${p.id}`">Editar</router-link>
              <button v-if="p.active" class="btn btn-danger btn-sm" style="margin-left:6px" @click="toggleActive(p)">Desactivar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; }
.thumb-placeholder {
  display: flex; align-items: center; justify-content: center;
  background: #f0f1f4; font-size: 16px;
}
</style>
