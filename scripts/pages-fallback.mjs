import { copyFileSync } from "node:fs";

// GitHub Pages serves 404.html for unknown paths and keeps the original URL.
// Copying the built app there lets a direct /mp2/meal/:id address boot React Router.
copyFileSync("dist/index.html", "dist/404.html");
