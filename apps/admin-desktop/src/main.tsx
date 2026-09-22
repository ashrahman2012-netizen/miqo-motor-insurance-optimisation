import React from "react";
import { createRoot } from "react-dom/client";
import "@miqo/ui/styles.css";
import "./styles.css";
import { ScaffoldApp } from "./app/ScaffoldApp";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("MIQOS Desktop root element is missing.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ScaffoldApp />
  </React.StrictMode>
);
