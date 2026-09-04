<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../lib/api';

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => !!route.params.id);

const form = ref({
  sku: '',
  name: '',
  brand: '',
  model: '',
  description: '',
  price: 0,
  stock: 0,
  minStock: 3,
  maxStock: 50,
});

const characteristics = ref<{ key: string; value: string }[]>([{ key: 'Calidad', value: '' }]);
const images = ref<{ url: string; isPrimary: boolean }[]>([]);
const uploading = ref(false);
const saving = ref(false);
const error = ref('');
const stockAdjustQty = ref(0);
const stockAdjustReason = ref('');
const movements = ref<any[]>([]);

const apiOrigin = (api.defaults.baseURL ?? '').replace(/\/api\/?$/, '');

async function loadProduct() {
  const { data } = await api.get(`/products/${route.params.id}`);
  form.value = {
    sku: data.sku,
    name: data.name,
    brand: data.brand,
    model: data.model,
    description: data.description ?? '',
    price: Number(data.price),
    stock: data.stock,
    minStock: data.minStock,
    maxStock: data.maxStock,
  };
  images.value = data.images.map((i: any) => ({ url: i.url, isPrimary: i.isPrimary }));
  characteristics.value = data.characteristics
    ? Object.entries(data.characteristics).map(([key, value]) => ({ key, value: String(value) }))
    : [{ key: '', value: '' }];
  const mv = await api.get(`/products/${route.params.id}/movements`);
  movements.value = mv.data;
}

onMounted(() => {
  if (isEdit.value) loadProduct();
});

function addCharacteristic() {
  characteristics.value.push({ key: '', value: '' });
}
function removeCharacteristic(idx: number) {
  characteristics.value.splice(idx, 1);
}

async function onFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  uploading.value = true;
  try {
    const fd = new FormData();
    Array.from(input.files).forEach((f) => fd.append('files', f));
    const { data } = await api.post('/uploads/images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    for (const f of data.files) {
      images.value.push({ url: f.url, isPrimary: images.value.length === 0 });
    }
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'Error al subir imágenes';
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

function removeImage(idx: number) {
  const wasPrimary = images.value[idx].isPrimary;
  images.value.splice(idx, 1);
  if (wasPrimary && images.value.length) images.value[0].isPrimary = true;
}
function setPrimary(idx: number) {
  images.value.forEach((img, i) => (img.isPrimary = i === idx));
}

async function submit() {
  error.value = '';
  saving.value = true;
  try {
    const characteristicsObj: Record<string, string> = {};
    for (const c of characteristics.value) {
      if (c.key.trim()) characteristicsObj[c.key.trim()] = c.value;
    }

    const payload = {
      ...form.value,
      characteristics: characteristicsObj,
      images: images.value.map((img, idx) => ({ ...img, order: idx })),
    };

    if (isEdit.value) {
      await api.patch(`/products/${route.params.id}`, payload);
    } else {
      await api.post('/products', payload);
    }
    router.push('/productos');
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudo guardar el producto';
  } finally {
    saving.value = false;
  }
}

async function applyStockAdjust() {
  if (!stockAdjustQty.value) return;
  await api.patch(`/products/${route.params.id}/stock/add`, {
    quantity: stockAdjustQty.value,
    reason: stockAdjustReason.value || undefined,
  });
  stockAdjustQty.value = 0;
  stockAdjustReason.value = '';
  await loadProduct();
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>{{ isEdit ? 'Editar producto' : 'Nuevo producto' }}</h1>
        <p>Cargá los datos del módulo de celular</p>
      </div>
      <router-link class="btn btn-secondary" to="/productos">Volver</router-link>
    </div>

    <form class="card mb-16" @submit.prevent="submit">
      <div class="grid grid-3">
        <div class="field">
          <label>SKU</label>
          <input v-model="form.sku" required />
        </div>
        <div class="field">
          <label>Nombre</label>
          <input v-model="form.name" required placeholder="Módulo Pantalla Samsung S21" />
        </div>
        <div class="field">
          <label>Precio ($)</label>
          <input v-model.number="form.price" type="number" min="0" step="0.01" required />
        </div>
        <div class="field">
          <label>Marca</label>
          <input v-model="form.brand" required placeholder="Samsung / Apple / Xiaomi" />
        </div>
        <div class="field">
          <label>Modelo</label>
          <input v-model="form.model" required placeholder="Galaxy S21 / iPhone 13" />
        </div>
      </div>

      <div class="field">
        <label>Descripción</label>
        <textarea v-model="form.description" rows="3"></textarea>
      </div>

      <div class="grid grid-3" v-if="!isEdit">
        <div class="field">
          <label>Stock inicial</label>
          <input v-model.number="form.stock" type="number" min="0" required />
        </div>
        <div class="field">
          <label>Stock mínimo (alerta)</label>
          <input v-model.number="form.minStock" type="number" min="0" required />
        </div>
        <div class="field">
          <label>Stock máximo</label>
          <input v-model.number="form.maxStock" type="number" min="1" required />
        </div>
      </div>
      <div class="grid grid-2" v-else>
        <div class="field">
          <label>Stock mínimo (alerta)</label>
          <input v-model.number="form.minStock" type="number" min="0" required />
        </div>
        <div class="field">
          <label>Stock máximo</label>
          <input v-model.number="form.maxStock" type="number" min="1" required />
        </div>
      </div>

      <div class="field">
        <label class="flex" style="justify-content: space-between;">
          Características
          <button type="button" class="btn btn-secondary btn-sm" @click="addCharacteristic">+ Agregar</button>
        </label>
        <div v-for="(c, idx) in characteristics" :key="idx" class="flex gap-8 mb-16">
          <input v-model="c.key" placeholder="Ej: Calidad" style="max-width: 200px" />
          <input v-model="c.value" placeholder="Ej: Original OLED" />
          <button type="button" class="btn btn-danger btn-sm" @click="removeCharacteristic(idx)">✕</button>
        </div>
      </div>

      <div class="field">
        <label>Imágenes</label>
        <input type="file" multiple accept="image/*" @change="onFilesSelected" :disabled="uploading" />
        <p v-if="uploading" class="muted">Subiendo imágenes...</p>
        <div class="image-grid mt-16">
          <div v-for="(img, idx) in images" :key="img.url" class="image-item" :class="{ primary: img.isPrimary }">
            <img :src="apiOrigin + img.url" />
            <div class="image-actions">
              <button type="button" class="btn btn-secondary btn-sm" @click="setPrimary(idx)" :disabled="img.isPrimary">
                {{ img.isPrimary ? 'Principal' : 'Marcar principal' }}
              </button>
              <button type="button" class="btn btn-danger btn-sm" @click="removeImage(idx)">Quitar</button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="btn btn-primary mt-16" type="submit" :disabled="saving">
        {{ saving ? 'Guardando...' : 'Guardar producto' }}
      </button>
    </form>

    <div v-if="isEdit" class="card">
      <h3 style="margin-top:0">Movimientos de stock</h3>
      <div class="flex gap-8 mb-16">
        <input v-model.number="stockAdjustQty" type="number" placeholder="Cantidad (+/-)" style="max-width: 160px" />
        <input v-model="stockAdjustReason" placeholder="Motivo (opcional)" />
        <button class="btn btn-primary btn-sm" @click="applyStockAdjust">Aplicar ajuste</button>
      </div>
      <table>
        <thead>
          <tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Ticket</th></tr>
        </thead>
        <tbody>
          <tr v-if="!movements.length"><td colspan="5" class="muted">Sin movimientos aún.</td></tr>
          <tr v-for="m in movements" :key="m.id">
            <td>{{ new Date(m.createdAt).toLocaleString('es-AR') }}</td>
            <td>{{ m.type }}</td>
            <td :style="{ color: m.quantity < 0 ? 'var(--danger)' : 'var(--success)' }">
              {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
            </td>
            <td class="muted">{{ m.reason }}</td>
            <td class="muted">{{ m.order?.ticketNumber ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.image-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.image-item { border: 2px solid var(--border); border-radius: 8px; padding: 6px; width: 140px; }
.image-item.primary { border-color: var(--primary); }
.image-item img { width: 100%; height: 90px; object-fit: cover; border-radius: 6px; }
.image-actions { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
</style>
