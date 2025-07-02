import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { configuration } from "./routers/configuration/index.js";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/configuration", configuration);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
