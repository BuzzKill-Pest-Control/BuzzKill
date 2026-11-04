import { initializeMonitoring } from "./monitoring";

// main.tsx imports this first so app-module evaluation failures reach the global handlers.
initializeMonitoring();
