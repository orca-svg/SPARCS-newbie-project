import app from "./app.ts";
import { config } from "./config/env.ts";

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
