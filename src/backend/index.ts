/// <reference types="@caido/sdk-backend" />

import type { APISDK, SDK } from "caido:plugin";

const UPDATE_METADATA_MUTATION = `
  mutation updateRequestMetadata($id: ID!, $input: UpdateRequestMetadataInput!) {
    updateRequestMetadata(id: $id, input: $input) {
      metadata {
        id
        color
      }
    }
  }
`;

const SETTINGS_KEY = "settings";
const SVG_CONTENT_TYPE = "image/svg+xml";

const JSON_MATCHES = ["application/json", "+json"];
const XML_MATCHES = ["application/xml", "text/xml", "+xml"];
const HTML_MATCHES = ["text/html", "application/xhtml+xml"];

const AUTO_COLOR_POLL_INTERVAL_MS = 1500;
const AUTO_COLOR_BATCH_SIZE = 200;
const MAX_PENDING = 1000;
const PENDING_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_CHECKS_PER_TICK = 50;

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

type CrayonAPI = {
  applyCrayonColors(ids: string[]): Promise<void>;
  getSettings(): Promise<CrayonSettings>;
  setSettings(settings: CrayonSettings): Promise<CrayonSettings>;
};

type ResponseLike = {
  getCode(): number | null;
  getHeader(name: string): Array<string> | undefined;
};

type AutoColorState = {
  initialized: boolean;
  lastCursor: string | null;
  polling: boolean;
  pending: Map<string, number>;
  timer: ReturnType<typeof setInterval> | null;
};

let cachedSettings: CrayonSettings | null = null;
let persistedSettings: CrayonSettings | null = null; // in-memory fallback persistence
const autoColorState: AutoColorState = {
  initialized: false,
  lastCursor: null,
  polling: false,
  pending: new Map(),
  timer: null,
};

export async function init(sdk: SDK) {
  const api = sdk.api as APISDK<CrayonAPI, Record<string, never>>;

  api.register("applyCrayonColors", async (sdkInstance: SDK, ids: string[]) => {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return;
      }

      const settings = await getSettings(sdkInstance);
      await applyColors(sdkInstance, ids, settings);
    } catch (error: unknown) {
      sdkInstance.console.error("Crayon: applyCrayonColors failed", error);
    }
  });

  api.register("getSettings", async (sdkInstance: SDK) => {
    try {
      return await getSettings(sdkInstance);
    } catch (error: unknown) {
      sdkInstance.console.error("Crayon: getSettings failed", error);
      return DEFAULT_SETTINGS;
    }
  });

  api.register("setSettings", async (sdkInstance: SDK, settings: CrayonSettings) => {
    const updated = normalizeSettings(settings);
    cachedSettings = updated;
    try {
      await writeSettings(sdkInstance, updated);
    } catch (error: unknown) {
      sdkInstance.console.error("Crayon: setSettings failed", error);
    }
    return updated;
  });

  try {
    await getSettings(sdk);
  } catch (error: unknown) {
    sdk.console.error("Crayon: failed to initialize settings cache", error);
  }

  try {
    startAutoColorPoller(sdk);
  } catch (error: unknown) {
    sdk.console.error("Crayon: failed to start auto-color poller", error);
  }

  try {
    sdk.events.onInterceptResponse(async (sdkInstance, request, response) => {
      const settings = await getSettings(sdkInstance);

      if (!settings.autoMode) {
        return;
      }

      const requestId = request.getId();
      try {
        await applyAutoColorFromResponse(sdkInstance, requestId, response, settings.colors);
      } catch (error: unknown) {
        sdkInstance.console.error(`Crayon: failed to auto-color request ${requestId}`, error);
      }
    });
  } catch (error: unknown) {
    sdk.console.error("Crayon: onInterceptResponse registration failed", error);
  }

  sdk.console.log("Crayon backend initialized and ready.");
}

async function getSettings(sdk: SDK): Promise<CrayonSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  cachedSettings = await readSettings(sdk);
  return cachedSettings;
}

function normalizeSettings(settings?: Partial<CrayonSettings> | null): CrayonSettings {
  return {
    autoMode: settings?.autoMode ?? DEFAULT_SETTINGS.autoMode,
    colors: {
      ...DEFAULT_SETTINGS.colors,
      ...(settings?.colors ?? {}),
    },
  };
}

async function readSettings(sdk: SDK): Promise<CrayonSettings> {
  if (persistedSettings) {
    return persistedSettings;
  }

  // No durable storage available in this SDK version; fall back to defaults.
  return DEFAULT_SETTINGS;
}

async function writeSettings(sdk: SDK, settings: CrayonSettings): Promise<void> {
  persistedSettings = settings;
}

function startAutoColorPoller(sdk: SDK) {
  if (autoColorState.timer) {
    return;
  }

  if (typeof setInterval !== "function") {
    sdk.console.warn("Crayon: timers unavailable, skipping auto-color poller");
    return;
  }

  autoColorState.timer = setInterval(() => {
    void pollAutoColoring(sdk);
  }, AUTO_COLOR_POLL_INTERVAL_MS);

  void pollAutoColoring(sdk);
}

async function pollAutoColoring(sdk: SDK) {
  if (autoColorState.polling) {
    return;
  }

  autoColorState.polling = true;

  try {
    const ready = await ensureCursorInitialized(sdk);
    if (!ready) {
      return;
    }
    const settings = await getSettings(sdk);

    if (!settings.autoMode) {
      autoColorState.pending.clear();
    } else {
      await processPendingResponses(sdk, settings);
    }

    await processNewResponses(sdk, settings);
  } catch (error: unknown) {
    sdk.console.error("Crayon: auto-color poll failed", error);
  } finally {
    autoColorState.polling = false;
  }
}

async function ensureCursorInitialized(sdk: SDK): Promise<boolean> {
  if (autoColorState.initialized) {
    return true;
  }

  try {
    const page = await sdk.requests.query().ascending("req", "created_at").last(1).execute();
    autoColorState.lastCursor = page.items.length > 0 ? page.pageInfo.endCursor : null;
    autoColorState.initialized = true;
    sdk.console.log("Crayon: auto-color cursor initialized successfully");
    return true;
  } catch (error: unknown) {
    // Silently fail during initialization - connection pool may not be ready yet
    // Will retry on next poll interval
    // Only log on first few attempts to avoid spam
    if (!autoColorState.initialized) {
      // Don't log error, just return false - this is expected during startup
    }
    return false;
  }
}

async function processNewResponses(sdk: SDK, settings: CrayonSettings) {
  const query = autoColorState.lastCursor
    ? sdk.requests
        .query()
        .ascending("req", "created_at")
        .after(autoColorState.lastCursor)
        .first(AUTO_COLOR_BATCH_SIZE)
    : sdk.requests.query().ascending("req", "created_at").first(AUTO_COLOR_BATCH_SIZE);

  const page = await query.execute();

  if (page.items.length === 0) {
    return;
  }

  autoColorState.lastCursor = page.pageInfo.endCursor ?? autoColorState.lastCursor;

  for (const item of page.items) {
    const id = item.request.getId();

    if (!item.response) {
      if (settings.autoMode) {
        trackPending(id);
      }
      continue;
    }

    if (!settings.autoMode) {
      continue;
    }

    try {
      await applyAutoColorFromResponse(sdk, id, item.response, settings.colors);
    } catch (error: unknown) {
      sdk.console.error(`Crayon: failed to auto-color request ${id}`, error);
    }
  }
}

async function processPendingResponses(sdk: SDK, settings: CrayonSettings) {
  if (autoColorState.pending.size === 0) {
    return;
  }

  const now = Date.now();
  prunePending(now);

  let processed = 0;
  for (const id of autoColorState.pending.keys()) {
    if (processed >= MAX_PENDING_CHECKS_PER_TICK) {
      break;
    }
    processed += 1;

    const record = await sdk.requests.get(id);
    const response = record?.response;
    if (!response) {
      continue;
    }

    autoColorState.pending.delete(id);
    await applyAutoColorFromResponse(sdk, id, response, settings.colors);
  }
}

function trackPending(id: string) {
  if (!id) {
    return;
  }

  if (autoColorState.pending.size >= MAX_PENDING) {
    const oldest = autoColorState.pending.keys().next().value;
    if (oldest) {
      autoColorState.pending.delete(oldest);
    }
  }

  autoColorState.pending.set(id, Date.now());
}

function prunePending(now: number) {
  for (const [id, seenAt] of autoColorState.pending.entries()) {
    if (now - seenAt > PENDING_TTL_MS) {
      autoColorState.pending.delete(id);
    }
  }
}

async function applyColors(sdk: SDK, ids: string[], settings: CrayonSettings) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  for (const id of uniqueIds) {
    try {
      const color = await determineColorForRequest(sdk, id, settings.colors);

      if (color === null) {
        continue;
      }

      sdk.console.log(`[Crayon] manual color ${id} -> ${color || "clear"}`);
      const response = await sdk.graphql.execute(UPDATE_METADATA_MUTATION, {
        id,
        input: { color },
      });

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors.map((e: any) => e.message).join(", "));
      }
    } catch (error: unknown) {
      sdk.console.error(`Crayon: failed to color request ${id}`, error);
    }
  }
}

async function applyAutoColorFromResponse(
  sdk: SDK,
  id: string,
  response: ResponseLike,
  colors: CrayonColors,
) {
  const color = pickColorFromResponse(response.getCode(), response.getHeader("Content-Type"), colors);

  if (color === null) {
    return;
  }

  const result = await sdk.graphql.execute(UPDATE_METADATA_MUTATION, {
    id,
    input: { color },
  });

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map((e: any) => e.message).join(", "));
  }
}

async function determineColorForRequest(
  sdk: SDK,
  id: string,
  colors: CrayonColors,
): Promise<string | null> {
  const record = await sdk.requests.get(id);
  const response = record?.response;

  if (!response) {
    return null;
  }

  return pickColorFromResponse(response.getCode(), response.getHeader("Content-Type"), colors);
}

function extractContentTypeFromHeaders(values?: Array<string>): string | null {
  if (!values || values.length === 0) {
    return null;
  }

  return values.join(";").trim().toLowerCase();
}

function pickColorFromResponse(
  status: number | null,
  headers: Array<string> | undefined,
  colors: CrayonColors,
): string | null {
  const contentType = extractContentTypeFromHeaders(headers);
  return pickColor(status, contentType, colors);
}

function pickColor(
  status: number | null,
  contentType: string | null,
  colors: CrayonColors,
): string | null {
  if (status === null) {
    return null;
  }

  if (status >= 200 && status < 300) {
    if (contentType) {
      if (isJsonContentType(contentType)) {
        return colors.json;
      }

      if (isXmlContentType(contentType)) {
        return colors.xml;
      }

      if (isHtmlContentType(contentType)) {
        return colors.html;
      }
    }

    return "";
  }

  if (status >= 500) {
    return colors.status5xx;
  }

  if (status >= 400) {
    return colors.status4xx;
  }

  if (status >= 300) {
    return colors.status3xx;
  }

  return null;
}

function isJsonContentType(contentType: string): boolean {
  return JSON_MATCHES.some((match) => contentType.includes(match));
}

function isXmlContentType(contentType: string): boolean {
  if (contentType.includes(SVG_CONTENT_TYPE)) {
    return false;
  }

  return XML_MATCHES.some((match) => contentType.includes(match));
}

function isHtmlContentType(contentType: string): boolean {
  return HTML_MATCHES.some((match) => contentType.includes(match));
}
