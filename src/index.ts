import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { jwt } from "hono/jwt";
import type { JwtVariables } from "hono/jwt";
import auth from "./routes/auth";
import message from "./routes/message";

const JWT_SECRET = process.env.JWT_SECRETE_KEY || "";

type Variables = JwtVariables;

const app = new Hono<{ Variables: Variables }>();

app.use(
  "/v1/*",
  jwt({
    secret: JWT_SECRET,
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono Backend API!");
});

app.route("/auth", auth);
app.route("/v1/message", message);

const port = 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
