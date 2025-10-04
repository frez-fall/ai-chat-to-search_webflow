// webflow-components/src/ChatWidget.webflow.tsx
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import ChatWidget from "./ChatWidget";
import "./tailwind.out.css";

export default declareComponent(ChatWidget, {
  name: "Chat Widget",
  description: "Search + dropdown + chat modal (original UI, no hero/bg).",
  props: {
    apiBaseUrl: props.Text({
      name: "API Base URL",
      defaultValue: "https://<your-vercel-app>.vercel.app",
    }),
  },
  options: {
    applyTagSelectors: true,
  },
});