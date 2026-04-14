import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import simboloJogoForca from "./assets/Simbolo Jogo Forca.ico";

const favicon =
  document.querySelector("link[rel='icon']") ?? document.createElement("link");

favicon.rel = "icon";
favicon.type = "image/x-icon";
favicon.href = simboloJogoForca;
document.head.appendChild(favicon);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
