import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  document.title = "IMT - Ipê Mind Tree";
  createRoot(root).render(<App />);
}
