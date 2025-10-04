import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import ChatWidget from "./ChatWidget";
import "./tailwind.out.css"; // compiled Tailwind output

export default declareComponent(ChatWidget, {
  name: "PayLater Chat Widget",
  description: "Search + dropdown + chat modal (original UI, no hero/bg).",
  props: {
    apiBaseUrl: props.Text({
      name: "API Base URL",
      defaultValue: "https://<your-vercel-backend>.vercel.app"
    })
  },
  options: {
    ssr: false,              // <<< IMPORTANT: avoid hydration mismatch (duplicates)
    applyTagSelectors: true  // if you want Webflow tag styles in Shadow DOM
  }
});