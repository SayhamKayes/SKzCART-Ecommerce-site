import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { LanguageProvider } from "./Context/LanguageContext";
import { FrontPanelProvider } from "./components/frontPanel/FrontPanelContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <FrontPanelProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </FrontPanelProvider>
  </StrictMode>
);
