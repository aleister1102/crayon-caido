import { Classic } from "@caido/primevue";
import type { CommandContext } from "@caido/sdk-frontend";
import PrimeVue from "primevue/config";
import { createApp, defineComponent } from "vue";

import Configuration from "./src/components/Configuration.vue";
import { SDKPlugin, setSDK } from "./src/plugins/sdk";
import type { FrontendSDK } from "./src/types";

const COMMAND_ID = "crayon.colorizeSelection";

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

export const init = (sdk: FrontendSDK) => {
  setSDK(sdk);
  const app = createApp(defineComponent({}));

  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });
  app.use(SDKPlugin, sdk);

  // Register settings in Caido Settings -> Plugins section
  sdk.settings.addToSlot("plugins-section", {
    type: "Custom",
    name: "Crayon",
    definition: { component: Configuration },
  });

  // Register context menu command for manual colorization
  sdk.commands.register(COMMAND_ID, {
    name: "Crayon: Colorize selection",
    run: async (context: CommandContext) => {
      const requestIds = collectRequestIds(context);

      if (requestIds.length === 0) {
        sdk.window.showToast("No requests selected to colorize", {
          variant: "warning",
        });
        return;
      }

      try {
        await sdk.backend.applyCrayonColors(requestIds);
        sdk.window.showToast(
          `Colorized ${requestIds.length} request${requestIds.length === 1 ? "" : "s"}`,
          { variant: "success" }
        );
      } catch (error) {
        sdk.window.showToast("Failed to colorize selection", {
          variant: "error",
        });
      }
    },
  });

  // Register context menu items
  sdk.menu.registerItem({
    type: "RequestRow",
    commandId: COMMAND_ID,
    leadingIcon: "fas fa-paintbrush",
  });

  sdk.menu.registerItem({
    type: "Request",
    commandId: COMMAND_ID,
    leadingIcon: "fas fa-paintbrush",
  });

  sdk.menu.registerItem({
    type: "Response",
    commandId: COMMAND_ID,
    leadingIcon: "fas fa-paintbrush",
  });
};
