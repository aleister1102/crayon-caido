import type { Caido } from "@caido/sdk-frontend";

export type CrayonColors = {
  json: string;
  xml: string;
  html: string;
  status5xx: string;
  status4xx: string;
  status3xx: string;
};

export type CrayonSettings = {
  autoMode: boolean;
  colors: CrayonColors;
};

export type BackendEndpoints = {
  applyCrayonColors(ids: string[]): Promise<void>;
  getSettings(): Promise<CrayonSettings>;
  setSettings(settings: CrayonSettings): Promise<CrayonSettings>;
};

export type FrontendSDK = Caido<BackendEndpoints>;

export const DEFAULT_SETTINGS: CrayonSettings = {
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
