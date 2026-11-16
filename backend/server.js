import "dotenv/config";
import app from "./src/app.js";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`DropZone API running on http://localhost:${PORT}`);
});