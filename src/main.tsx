import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FhirProvider } from "./context/FhirContext";
import App from "./App";
import "./lib/security";
import "./styles/globals.css";
import "./styles/powerchart.css";

window.onerror = (message, _source, _lineno, _colno, error) => {
  console.error("Unhandled error:", message, error);
};

window.onunhandledrejection = (event) => {
  console.error("Unhandled promise rejection:", event.reason);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  },
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FhirProvider>
        <App />
      </FhirProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
