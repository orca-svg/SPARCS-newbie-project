import express from "express";
import cors from "cors";
import { config } from "./config/env.ts";
import routes from "./routes/index.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);
app.use(errorHandler);

const port = config.port;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
