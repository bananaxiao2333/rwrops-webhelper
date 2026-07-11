import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material";
import App from "./App.jsx";
import { DataProvider } from "./DataContext.jsx";
import { I18nProvider } from "./i18n.jsx";
import tacticalDark from "./theme.js";
import "./main.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={tacticalDark}>
      <DataProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </DataProvider>
    </ThemeProvider>
  </StrictMode>,
);
