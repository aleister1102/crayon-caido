<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import ColorPicker from "primevue/colorpicker";
import { computed, onMounted, ref } from "vue";

import { useSDK } from "../plugins/sdk";
import { DEFAULT_SETTINGS, type CrayonSettings } from "../types";

const sdk = useSDK();

const loading = ref(true);
const saving = ref(false);
const statusMessage = ref("");
const statusError = ref(false);

const autoMode = ref(DEFAULT_SETTINGS.autoMode);
const jsonColor = ref(DEFAULT_SETTINGS.colors.json.slice(1));
const xmlColor = ref(DEFAULT_SETTINGS.colors.xml.slice(1));
const htmlColor = ref(DEFAULT_SETTINGS.colors.html.slice(1));
const status5xxColor = ref(DEFAULT_SETTINGS.colors.status5xx.slice(1));
const status4xxColor = ref(DEFAULT_SETTINGS.colors.status4xx.slice(1));
const status3xxColor = ref(DEFAULT_SETTINGS.colors.status3xx.slice(1));

const previewColors = computed(() => ({
  json: `#${jsonColor.value}`,
  xml: `#${xmlColor.value}`,
  html: `#${htmlColor.value}`,
  status5xx: `#${status5xxColor.value}`,
  status4xx: `#${status4xxColor.value}`,
  status3xx: `#${status3xxColor.value}`,
}));

onMounted(async () => {
  await loadSettings();
});

async function loadSettings() {
  loading.value = true;
  setStatus("Loading settings...");

  try {
    const settings = await loadSettingsWithRetry();
    populateForm(settings);
    setStatus("");
  } catch {
    populateForm(DEFAULT_SETTINGS);
    setStatus("Using defaults (backend unavailable).", true);
  } finally {
    loading.value = false;
  }
}

async function loadSettingsWithRetry(): Promise<CrayonSettings> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await sdk.backend.getSettings();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError;
}

function populateForm(settings: CrayonSettings) {
  autoMode.value = settings.autoMode;
  jsonColor.value = settings.colors.json.slice(1);
  xmlColor.value = settings.colors.xml.slice(1);
  htmlColor.value = settings.colors.html.slice(1);
  status5xxColor.value = settings.colors.status5xx.slice(1);
  status4xxColor.value = settings.colors.status4xx.slice(1);
  status3xxColor.value = settings.colors.status3xx.slice(1);
}

async function handleSave() {
  saving.value = true;
  setStatus("Saving...");

  const nextSettings: CrayonSettings = {
    autoMode: autoMode.value,
    colors: {
      json: `#${jsonColor.value}`,
      xml: `#${xmlColor.value}`,
      html: `#${htmlColor.value}`,
      status5xx: `#${status5xxColor.value}`,
      status4xx: `#${status4xxColor.value}`,
      status3xx: `#${status3xxColor.value}`,
    },
  };

  try {
    const updated = await sdk.backend.setSettings(nextSettings);
    populateForm(updated);
    setStatus("Saved.");
  } catch {
    setStatus("Failed to save settings.", true);
  } finally {
    saving.value = false;
  }
}

async function handleReset() {
  saving.value = true;
  setStatus("Resetting...");

  try {
    const updated = await sdk.backend.setSettings(DEFAULT_SETTINGS);
    populateForm(updated);
    setStatus("Reset to defaults.");
  } catch {
    setStatus("Failed to reset settings.", true);
  } finally {
    saving.value = false;
  }
}

function setStatus(message: string, isError = false) {
  statusMessage.value = message;
  statusError.value = isError;
}
</script>

<template>
  <div class="crayon-config">
    <div class="crayon-header">
      <h2>Crayon Settings</h2>
      <p class="crayon-subtitle">
        Customize how Crayon highlights your traffic in Proxy History.
      </p>
    </div>

    <div class="crayon-layout">
      <!-- Settings Section -->
      <div class="crayon-section">
        <div class="crayon-section-title">General</div>
        <div class="crayon-row">
          <label for="auto-mode">Auto color History items</label>
          <Checkbox
            v-model="autoMode"
            inputId="auto-mode"
            :binary="true"
            :disabled="loading || saving"
          />
        </div>
      </div>

      <div class="crayon-section">
        <div class="crayon-section-title">Response Colors</div>
        <div class="crayon-grid">
          <div class="crayon-row">
            <label>2xx JSON</label>
            <ColorPicker v-model="jsonColor" :disabled="loading || saving" />
          </div>
          <div class="crayon-row">
            <label>5xx Status</label>
            <ColorPicker
              v-model="status5xxColor"
              :disabled="loading || saving"
            />
          </div>
          <div class="crayon-row">
            <label>2xx XML</label>
            <ColorPicker v-model="xmlColor" :disabled="loading || saving" />
          </div>
          <div class="crayon-row">
            <label>4xx Status</label>
            <ColorPicker
              v-model="status4xxColor"
              :disabled="loading || saving"
            />
          </div>
          <div class="crayon-row">
            <label>2xx HTML</label>
            <ColorPicker v-model="htmlColor" :disabled="loading || saving" />
          </div>
          <div class="crayon-row">
            <label>3xx Status</label>
            <ColorPicker
              v-model="status3xxColor"
              :disabled="loading || saving"
            />
          </div>
        </div>
      </div>

      <!-- Preview Section -->
      <div class="crayon-section">
        <div class="crayon-section-title">Live Preview</div>
        <div class="crayon-preview-list">
          <div class="crayon-preview-item">
            <div
              class="crayon-preview-accent"
              :style="{ backgroundColor: previewColors.json }"
            />
            <span class="crayon-preview-label">JSON</span>
            <span class="crayon-preview-value">200 application/json</span>
          </div>
          <div class="crayon-preview-item">
            <div
              class="crayon-preview-accent"
              :style="{ backgroundColor: previewColors.xml }"
            />
            <span class="crayon-preview-label">XML</span>
            <span class="crayon-preview-value">200 application/xml</span>
          </div>
          <div class="crayon-preview-item">
            <div
              class="crayon-preview-accent"
              :style="{ backgroundColor: previewColors.html }"
            />
            <span class="crayon-preview-label">HTML</span>
            <span class="crayon-preview-value">200 text/html</span>
          </div>
          <div class="crayon-preview-item">
            <div
              class="crayon-preview-accent"
              :style="{ backgroundColor: previewColors.status5xx }"
            />
            <span class="crayon-preview-label">Error</span>
            <span class="crayon-preview-value">500 Internal Server Error</span>
          </div>
          <div class="crayon-preview-item">
            <div
              class="crayon-preview-accent"
              :style="{ backgroundColor: previewColors.status4xx }"
            />
            <span class="crayon-preview-label">Warning</span>
            <span class="crayon-preview-value">404 Not Found</span>
          </div>
          <div class="crayon-preview-item">
            <div
              class="crayon-preview-accent"
              :style="{ backgroundColor: previewColors.status3xx }"
            />
            <span class="crayon-preview-label">Redirect</span>
            <span class="crayon-preview-value">302 Found</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="crayon-actions">
        <Button
          label="Save"
          severity="primary"
          :loading="saving"
          :disabled="loading"
          @click="handleSave"
        />
        <Button
          label="Reset"
          severity="secondary"
          :disabled="loading || saving"
          @click="handleReset"
        />
        <span class="crayon-status" :class="{ 'is-error': statusError }">
          {{ statusMessage }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crayon-config {
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
}

.crayon-header {
  margin-bottom: 24px;
}

.crayon-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.crayon-subtitle {
  margin: 0;
  font-size: 14px;
  opacity: 0.7;
}

.crayon-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.crayon-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.crayon-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  opacity: 0.5;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.crayon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 32px;
}

.crayon-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 4px 0;
}

.crayon-row label {
  font-size: 14px;
  white-space: nowrap;
}

.crayon-preview-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.crayon-preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 13px;
}

.crayon-preview-accent {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.crayon-preview-label {
  font-weight: 500;
  min-width: 60px;
}

.crayon-preview-value {
  opacity: 0.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.crayon-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.crayon-status {
  font-size: 13px;
  opacity: 0.7;
  margin-left: auto;
}

.crayon-status.is-error {
  color: #ef4444;
  opacity: 1;
}
</style>
