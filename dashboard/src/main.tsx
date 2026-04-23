import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import { RealtimeProvider } from "./lib/realtime";
import { App } from "./app/App";
import "./index.css";

// Apply saved theme before render to avoid flash
const savedTheme = localStorage.getItem("plyknot-theme");
if (savedTheme === "light") {
  document.documentElement.classList.add("light");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RealtimeProvider>
            <App />
            <Toaster position="bottom-right" theme="dark" />
          </RealtimeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
