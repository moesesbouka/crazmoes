import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadStoredImages } from "./lib/storedImages";

// Pre-load stored image mappings before render
loadStoredImages();

createRoot(document.getElementById("root")!).render(<App />);
