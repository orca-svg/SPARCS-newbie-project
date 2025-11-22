import express from "express";
import cors from "cors";
import { config } from "./config/env.ts";
import routes from "./routes/index.ts";
import {errorHandler} from "./middleware/errorHandler.ts"

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);

app.use(errorHandler);

export default app;
