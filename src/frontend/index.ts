import type { Caido, CommandContext } from "@caido/sdk-frontend";

const COMMAND_ID = "crayon.colorizeSelection";
const SETTINGS_PATH = "/settings/crayon";
const SIDEBAR_PATH = "/crayon-settings";

type CrayonColors = {
  json: string;
  xml: string;
  html: string;
  status5xx: string;
  status4xx: string;
  status3xx: string;
};

type CrayonSettings = {
  autoMode: boolean;
  colors: CrayonColors;
};

const DEFAULT_SETTINGS: CrayonSettings = {
  autoMode: true,
  colors: {
    json: "#157a37",
    xml: "#0b4ea8",
    html: "#1f7aa8",
    status5xx: "#a32f2a",
    status4xx: "#a06008",
    status3xx: "#8a7a06",
  },
};

type BackendEndpoints = {
  applyCrayonColors(ids: string[]): Promise<void>;
  getSettings(): Promise<CrayonSettings>;
  setSettings(settings: CrayonSettings): Promise<CrayonSettings>;
};

function collectRequestIds(context: CommandContext): string[] {
  const ids = new Set<string>();

  if (context.type === "RequestRowContext") {
    context.requests
      .map((request) => request.id)
      .filter(Boolean)
      .forEach((id) => ids.add(id));
  } else if (context.type === "RequestContext") {
    if ("id" in context.request && context.request.id) {
      ids.add(context.request.id);
    }
  } else if (context.type === "ResponseContext") {
    if (context.request.id) {
      ids.add(context.request.id);
    }
  }

  return Array.from(ids);
}

export const init = (caido: Caido<BackendEndpoints>) => {
  const settingsPage = createSettingsPage(caido);
  caido.navigation.addPage(SETTINGS_PATH, {
    body: settingsPage.element,
    onEnter: () => {
      caido.navigation.goTo(SIDEBAR_PATH);
    },
  });
  const sidebarPage = createSettingsPage(caido);
  caido.navigation.addPage(SIDEBAR_PATH, {
    body: sidebarPage.element,
    onEnter: sidebarPage.refresh,
  });

  caido.commands.register(COMMAND_ID, {
    name: "Crayon: Colorize selection",
    run: async (context: CommandContext) => {
      const requestIds = collectRequestIds(context);

      if (requestIds.length === 0) {
        caido.log.warn("Crayon: no request selected to colorize.");
        return;
      }

      try {
        await caido.backend.applyCrayonColors(requestIds);
      } catch (error) {
        caido.log.error("Crayon: failed to color selection", error);
      }
    },
  });

  caido.menu.registerItem({
    type: "Settings",
    label: "Crayon",
    path: SETTINGS_PATH,
    leadingIcon: "fas fa-paintbrush",
  });
  caido.sidebar.registerItem("Crayon", SIDEBAR_PATH, {
    icon: "fas fa-paintbrush",
    group: "Plugins",
  });
  caido.log.info("Crayon frontend loaded; settings page registered.");
  caido.menu.registerItem({ type: "RequestRow", commandId: COMMAND_ID });
  caido.menu.registerItem({ type: "Request", commandId: COMMAND_ID });
  caido.menu.registerItem({ type: "Response", commandId: COMMAND_ID });
};

function createSettingsPage(caido: Caido<BackendEndpoints>) {
  const container = document.createElement("div");
  container.className = "crayon-settings";

  const style = document.createElement("style");
  style.textContent = `
    .crayon-settings {
      padding: 60px 40px;
      width: 100%;
      min-height: 100%;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow-y: auto;
    }
    .crayon-layout {
      display: flex;
      flex-direction: row;
      gap: 48px;
      align-items: start;
      justify-content: center;
      width: 100%;
      max-width: 1400px;
      margin: auto;
    }
    @media (max-width: 1100px) {
      .crayon-layout {
        flex-direction: column;
        align-items: center;
      }
    }
    .crayon-card-stack {
      display: grid;
      gap: 32px;
      padding: 40px;
      min-width: 450px;
    }
    .crayon-header {
      margin-bottom: 8px;
    }
    .crayon-header h1 {
      margin: 0;
      font-size: 28px;
    }
    .crayon-subtitle {
      margin: 8px 0 0;
      font-size: 18px;
      opacity: 0.7;
    }
    .crayon-section {
      display: grid;
      gap: 24px;
    }
    .crayon-section-title {
      font-size: 16px;
      font-weight: 600;
      text-transform: uppercase;
      opacity: 0.5;
      margin-bottom: 12px;
      border-bottom: 2px solid var(--border-color, rgba(255,255,255,0.05));
      padding-bottom: 8px;
    }
    .crayon-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px 48px;
    }
    .crayon-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      padding: 8px 0;
    }
    .crayon-row label {
      font-size: 18px;
      white-space: nowrap;
    }
    .crayon-row input[type="color"] {
      width: 72px;
      height: 40px;
      padding: 0;
      background: transparent;
      border: 1px solid var(--border-color, rgba(255,255,255,0.1));
      border-radius: 8px;
      cursor: pointer;
    }
    .crayon-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 40px;
    }
    .crayon-status {
      font-size: 16px;
      opacity: 0.7;
      margin-left: auto;
    }
    .crayon-status.is-error {
      color: var(--color-danger, #ef4444);
    }
    .crayon-preview-list {
      display: grid;
      gap: 16px;
      padding: 40px;
      min-width: 450px;
    }
    .crayon-preview-item {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 16px 24px;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--border-color, rgba(255,255,255,0.05));
      border-radius: 12px;
      font-size: 18px;
    }
    .crayon-preview-accent {
      width: 8px;
      height: 24px;
      border-radius: 4px;
    }
    .crayon-preview-label {
      font-weight: 500;
      min-width: 120px;
    }
    .crayon-preview-value {
      opacity: 0.6;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 16px;
    }
  `;
  container.appendChild(style);

  const header = document.createElement("div");
  header.className = "crayon-header";
  const title = document.createElement("h1");
  title.textContent = "Crayon Settings";
  const subtitle = document.createElement("p");
  subtitle.className = "crayon-subtitle";
  subtitle.textContent = "Customize how Crayon highlights your traffic in Proxy History.";
  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  const layout = document.createElement("div");
  layout.className = "crayon-layout";
  container.appendChild(layout);

  // --- LEFT COLUMN: Settings ---
  const settingsCardBody = document.createElement("div");
  settingsCardBody.className = "crayon-card-stack";

  const generalSection = document.createElement("div");
  generalSection.className = "crayon-section";
  const generalTitle = document.createElement("div");
  generalTitle.className = "crayon-section-title";
  generalTitle.textContent = "General";
  generalSection.appendChild(generalTitle);

  const autoToggle = document.createElement("input");
  autoToggle.type = "checkbox";
  generalSection.appendChild(createSettingRow("Auto color History items", autoToggle));
  settingsCardBody.appendChild(generalSection);

  const colorsSection = document.createElement("div");
  colorsSection.className = "crayon-section";
  const colorsTitle = document.createElement("div");
  colorsTitle.className = "crayon-section-title";
  colorsTitle.textContent = "Colors";
  colorsSection.appendChild(colorsTitle);

  const colorGrid = document.createElement("div");
  colorGrid.className = "crayon-grid";

  const jsonColor = createColorInput(DEFAULT_SETTINGS.colors.json);
  const xmlColor = createColorInput(DEFAULT_SETTINGS.colors.xml);
  const htmlColor = createColorInput(DEFAULT_SETTINGS.colors.html);
  const status5xxColor = createColorInput(DEFAULT_SETTINGS.colors.status5xx);
  const status4xxColor = createColorInput(DEFAULT_SETTINGS.colors.status4xx);
  const status3xxColor = createColorInput(DEFAULT_SETTINGS.colors.status3xx);

  colorGrid.appendChild(createSettingRow("2xx JSON", jsonColor));
  colorGrid.appendChild(createSettingRow("5xx Status", status5xxColor));
  colorGrid.appendChild(createSettingRow("2xx XML", xmlColor));
  colorGrid.appendChild(createSettingRow("4xx Status", status4xxColor));
  colorGrid.appendChild(createSettingRow("2xx HTML", htmlColor));
  colorGrid.appendChild(createSettingRow("3xx Status", status3xxColor));

  colorsSection.appendChild(colorGrid);
  settingsCardBody.appendChild(colorsSection);

  const actions = document.createElement("div");
  actions.className = "crayon-actions";
  const saveButton = caido.ui.button({ variant: "primary", label: "Save", size: "medium" });
  const resetButton = caido.ui.button({ variant: "tertiary", label: "Reset", size: "medium" });
  const status = document.createElement("span");
  status.className = "crayon-status";
  actions.appendChild(saveButton);
  actions.appendChild(resetButton);
  actions.appendChild(status);

  const settingsCard = caido.ui.card({
    body: settingsCardBody,
    footer: actions,
  });
  layout.appendChild(settingsCard);

  // --- RIGHT COLUMN: Preview ---
  const previewList = document.createElement("div");
  previewList.className = "crayon-preview-list";

  const jsonPreview = createPreviewItem("JSON", "200 application/json");
  const xmlPreview = createPreviewItem("XML", "200 application/xml");
  const htmlPreview = createPreviewItem("HTML", "200 text/html");
  const status5xxPreview = createPreviewItem("Error", "500 Internal Server Error");
  const status4xxPreview = createPreviewItem("Warning", "404 Not Found");
  const status3xxPreview = createPreviewItem("Redirect", "302 Found");

  previewList.append(jsonPreview.element, xmlPreview.element, htmlPreview.element, status5xxPreview.element, status4xxPreview.element, status3xxPreview.element);

  const previewCard = caido.ui.card({
    header: createCardHeader("Live Preview"),
    body: previewList,
  });
  layout.appendChild(previewCard);

  let currentSettings = DEFAULT_SETTINGS;

  function updatePreview() {
    jsonPreview.set(jsonColor.value);
    xmlPreview.set(xmlColor.value);
    htmlPreview.set(htmlColor.value);
    status5xxPreview.set(status5xxColor.value);
    status4xxPreview.set(status4xxColor.value);
    status3xxPreview.set(status3xxColor.value);
  }

  [jsonColor, xmlColor, htmlColor, status5xxColor, status4xxColor, status3xxColor].forEach(input => {
    input.addEventListener("input", updatePreview);
  });

  async function refresh() {
    setStatus("Loading settings...");
    setButtonEnabled(saveButton, false);
    setButtonEnabled(resetButton, false);

    try {
      const settings = await loadSettingsWithRetry(caido);
      currentSettings = settings ?? DEFAULT_SETTINGS;
      populateForm(currentSettings);
      setStatus("");
    } catch (error) {
      currentSettings = DEFAULT_SETTINGS;
      populateForm(currentSettings);
      setStatus("Using defaults (backend unavailable).", true);
      caido.log.error("Crayon: failed to load settings", error);
    } finally {
      setButtonEnabled(saveButton, true);
      setButtonEnabled(resetButton, true);
    }
  }

  async function save() {
    setButtonEnabled(saveButton, false);
    setButtonEnabled(resetButton, false);
    setStatus("Saving...");

    const nextSettings: CrayonSettings = {
      autoMode: autoToggle.checked,
      colors: {
        json: jsonColor.value,
        xml: xmlColor.value,
        html: htmlColor.value,
        status5xx: status5xxColor.value,
        status4xx: status4xxColor.value,
        status3xx: status3xxColor.value,
      },
    };

    try {
      const updated = await caido.backend.setSettings(nextSettings);
      currentSettings = updated ?? nextSettings;
      populateForm(currentSettings);
      setStatus("Saved.");
    } catch (error) {
      setStatus("Failed to save settings.", true);
      caido.log.error("Crayon: failed to save settings", error);
    } finally {
      setButtonEnabled(saveButton, true);
      setButtonEnabled(resetButton, true);
    }
  }

  async function reset() {
    if (!confirm("Reset all colors and settings to defaults?")) {
      return;
    }

    setButtonEnabled(saveButton, false);
    setButtonEnabled(resetButton, false);
    setStatus("Resetting...");

    try {
      const updated = await caido.backend.setSettings(DEFAULT_SETTINGS);
      currentSettings = updated ?? DEFAULT_SETTINGS;
      populateForm(currentSettings);
      setStatus("Reset to defaults.");
    } catch (error) {
      setStatus("Failed to reset settings.", true);
      caido.log.error("Crayon: failed to reset settings", error);
    } finally {
      setButtonEnabled(saveButton, true);
      setButtonEnabled(resetButton, true);
    }
  }

  function populateForm(settings: CrayonSettings) {
    autoToggle.checked = settings.autoMode;
    jsonColor.value = settings.colors.json;
    xmlColor.value = settings.colors.xml;
    htmlColor.value = settings.colors.html;
    status5xxColor.value = settings.colors.status5xx;
    status4xxColor.value = settings.colors.status4xx;
    status3xxColor.value = settings.colors.status3xx;
    updatePreview();
  }

  function setStatus(message: string, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  saveButton.addEventListener("click", save);
  resetButton.addEventListener("click", reset);

  return { element: container, refresh };
}

function createCardHeader(text: string) {
  const h = document.createElement("div");
  h.style.fontSize = "20px";
  h.style.fontWeight = "600";
  h.style.opacity = "0.8";
  h.style.padding = "24px 40px";
  h.textContent = text;
  return h;
}

function createPreviewItem(label: string, value: string) {
  const element = document.createElement("div");
  element.className = "crayon-preview-item";

  const accent = document.createElement("div");
  accent.className = "crayon-preview-accent";

  const labelEl = document.createElement("span");
  labelEl.className = "crayon-preview-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "crayon-preview-value";
  valueEl.textContent = value;

  element.append(accent, labelEl, valueEl);

  return {
    element,
    set: (color: string) => {
      accent.style.backgroundColor = color;
    }
  };
}

function createColorInput(value: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  return input;
}

let rowId = 0;

function createSettingRow(labelText: string, control: HTMLElement) {
  const row = document.createElement("div");
  row.className = "crayon-row";
  const label = document.createElement("label");
  label.textContent = labelText;

  if (control instanceof HTMLInputElement) {
    rowId += 1;
    const id = `crayon-setting-${rowId}`;
    control.id = id;
    label.htmlFor = id;
  }

  row.appendChild(label);
  row.appendChild(control);
  return row;
}

function setButtonEnabled(button: HTMLElement, enabled: boolean) {
  if (button instanceof HTMLButtonElement) {
    button.disabled = !enabled;
  }

  button.setAttribute("aria-disabled", enabled ? "false" : "true");
  button.style.pointerEvents = enabled ? "auto" : "none";
  button.style.opacity = enabled ? "1" : "0.6";
}

async function loadSettingsWithRetry(caido: Caido<BackendEndpoints>): Promise<CrayonSettings> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await caido.backend.getSettings();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError;
}
