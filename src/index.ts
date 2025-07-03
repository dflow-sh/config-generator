import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { configuration } from "./routers/configuration/index.js";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "../env.js";

const app = new Hono();

app.use(logger());
app.use(
  "*",
  cors({
    origin: "*", // using wildcard in cors
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["POST", "DELETE", "GET"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 600,
    credentials: true,
  })
);

app.get("/", (c) => {
  return c.json(
    {
      message: "Hello from proxy-configurator!",
    },
    {
      status: 200,
    }
  );
});

app.route("/configuration", configuration);

serve(
  {
    fetch: app.fetch,
    port: +env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
