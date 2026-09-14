// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { BranchProvider } from "./contexts/BranchContext";
import { warmupSupabaseConnection } from "./lib/supabaseClient";
import "./styles/global.css";

warmupSupabaseConnection();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BranchProvider>
      <App />
    </BranchProvider>
  </React.StrictMode>
);