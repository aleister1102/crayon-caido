import { inject, type App, type InjectionKey } from "vue";

import type { FrontendSDK } from "../types";

export const sdkKey: InjectionKey<FrontendSDK> = Symbol("sdk");

let cachedSdk: FrontendSDK | null = null;

export const SDKPlugin = {
  install(app: App, sdk: FrontendSDK) {
    cachedSdk = sdk;
    app.provide(sdkKey, sdk);
  },
};

export const setSDK = (sdk: FrontendSDK) => {
  cachedSdk = sdk;
};

export function useSDK(): FrontendSDK {
  const sdk = inject(sdkKey, null);
  if (sdk) {
    return sdk;
  }
  if (cachedSdk) {
    return cachedSdk;
  }
  throw new Error("SDK not provided");
}
