<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../lib/api';

const form = ref({ bankCbu: '', bankAlias: '', bankHolder: '', ticketHours: 24 });
const loading = ref(true);
const saving = ref(false);
const saved = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  const { data } = await api.get('/settings');
  form.value = {
    bankCbu: data.bankCbu ?? '',
    bankAlias: data.bankAlias ?? '',
    bankHolder: data.bankHolder ?? '',
    ticketHours: data.ticketHours ?? 24,
  };
  loading.value = false;
}
onMounted(load);

async function submit() {
  saving.value = true;
  error.value = '';
  saved.value = false;
  try {
    await api.patch('/settings', form.value);
    saved.value = true;
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudo guardar';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Configuración</h1>
        <p>Datos bancarios que se muestran al cliente en el ticket de pago</p>
      </div>
    </div>

    <div v-if="loading" class="muted">Cargando...</div>

    <form v-else class="card" style="max-width: 480px" @submit.prevent="submit">
      <div class="field">
        <label>CBU</label>
        <input v-model="form.bankCbu" required />
      </div>
      <div class="field">
        <label>Alias (opcional)</label>
        <input v-model="form.bankAlias" />
      </div>
      <div class="field">
        <label>Titular de la cuenta</label>
        <input v-model="form.bankHolder" required />
      </div>
      <div class="field">
        <label>Horas de validez del ticket</label>
        <input v-model.number="form.ticketHours" type="number" min="1" required />
      </div>

      <button class="btn btn-primary" type="submit" :disabled="saving">
        {{ saving ? 'Guardando...' : 'Guardar cambios' }}
      </button>
      <p v-if="saved" class="muted mt-16" style="color: var(--success)">✅ Guardado correctamente</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </form>
  </div>
</template>
