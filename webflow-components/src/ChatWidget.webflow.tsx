// ChatWidget.webflow.tsx (wrapper)
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import ChatWidget from "./ChatWidget";
import "./styles/tokens.css";
import "./tailwind.out.css";

export default declareComponent(ChatWidget, {
  name: "PayLater Chat Widget",
  description: "Search + dropdown + chat modal (original UI, no hero/bg).",
  props: {
    apiBaseUrl: props.Text({
      name: "API Base URL",
      defaultValue: "https://<your-vercel-backend>.vercel.app",
    }),
  },
  options: {
    // Keep SSR off for Code Components to avoid hydration duplication issues
    ssr: false,
    // Lets Webflow tag styles (h1, p, button, etc.) cascade inside the Shadow DOM
    applyTagSelectors: true,
  },
});