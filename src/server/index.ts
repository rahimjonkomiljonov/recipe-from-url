import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`Recipe manager listening on http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY not set — YouTube/Instagram extraction will be unavailable until you add one to .env");
  }
});
