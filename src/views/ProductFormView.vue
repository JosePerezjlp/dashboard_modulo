<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
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

// ============ IMÁGENES ============
// Celular/tablet: el input con `capture` abre la cámara directamente.
// PC: se usa la webcam vía getUserMedia (si hay), o se eligen archivos de una carpeta.
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
const fileInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);
const dragging = ref(false);

const webcamOpen = ref(false);
const webcamVideo = ref<HTMLVideoElement | null>(null);
let webcamStream: MediaStream | null = null;

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// Reduce fotos grandes (las del celular suelen pesar 3-10MB) y las pasa a JPEG,
// lo que además convierte formatos como HEIC cuando el navegador puede leerlos.
async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob || (scale === 1 && blob.size >= file.size && file.type !== 'image/heic')) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function uploadFiles(files: File[]) {
  const imagesOnly = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
  if (!imagesOnly.length) {
    error.value = 'Solo se pueden subir imágenes';
    return;
  }
  error.value = '';
  uploading.value = true;
  try {
    const prepared = await Promise.all(imagesOnly.map(compressImage));
    const fd = new FormData();
    prepared.forEach((f) => fd.append('files', f));
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
  }
}

function onFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) uploadFiles(Array.from(input.files));
  input.value = '';
}

function onDrop(e: DragEvent) {
  dragging.value = false;
  if (uploading.value) return;
  const files = Array.from(e.dataTransfer?.files ?? []);
  if (files.length) uploadFiles(files);
}

async function takePhoto() {
  if (isTouchDevice || !navigator.mediaDevices?.getUserMedia) {
    cameraInput.value?.click();
    return;
  }
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcamOpen.value = true;
    await nextTick();
    if (webcamVideo.value) webcamVideo.value.srcObject = webcamStream;
  } catch {
    error.value = 'No se encontró una cámara o no se dio permiso. Podés elegir las imágenes desde una carpeta.';
  }
}

function closeWebcam() {
  webcamStream?.getTracks().forEach((t) => t.stop());
  webcamStream = null;
  webcamOpen.value = false;
}

async function captureWebcam() {
  const video = webcamVideo.value;
  if (!video || !video.videoWidth) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  closeWebcam();
  if (blob) uploadFiles([new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
}

onBeforeUnmount(closeWebcam);

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
        <div
          class="dropzone"
          :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <div class="flex gap-8 upload-buttons">
            <button type="button" class="btn btn-secondary" :disabled="uploading" @click="fileInput?.click()">
              📁 {{ isTouchDevice ? 'Elegir de la galería' : 'Elegir desde la computadora' }}
            </button>
            <button type="button" class="btn btn-secondary" :disabled="uploading" @click="takePhoto">
              📷 Sacar foto
            </button>
          </div>
          <p v-if="!isTouchDevice" class="muted dropzone-hint">o arrastrá las imágenes acá</p>
          <p v-if="uploading" class="muted">Subiendo imágenes...</p>
        </div>
        <input ref="fileInput" type="file" multiple accept="image/*" hidden @change="onFilesSelected" />
        <input ref="cameraInput" type="file" accept="image/*" capture="environment" hidden @change="onFilesSelected" />

        <div v-if="webcamOpen" class="webcam-overlay" @click.self="closeWebcam">
          <div class="card webcam-box">
            <video ref="webcamVideo" autoplay playsinline muted></video>
            <div class="flex gap-8 mt-16" style="justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" @click="closeWebcam">Cancelar</button>
              <button type="button" class="btn btn-primary" @click="captureWebcam">Capturar</button>
            </div>
          </div>
        </div>
        <div class="image-grid mt-16">
          <div v-for="(img, idx) in images" :key="img.url" class="image-item" :class="{ primary: img.isPrimary }">
            <img :src="img.url.startsWith('http') ? img.url : apiOrigin + img.url" />
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
.dropzone { border: 2px dashed var(--border); border-radius: 8px; padding: 16px; text-align: center; }
.dropzone.dragging { border-color: var(--primary); }
.dropzone-hint { margin: 8px 0 0; }
.upload-buttons { justify-content: center; flex-wrap: wrap; }
.webcam-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;
}
.webcam-box { width: 100%; max-width: 640px; }
.webcam-box video { width: 100%; border-radius: 6px; background: #000; }
</style>
