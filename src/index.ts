import { serve } from "@hono/node-server";
import { Hono } from "hono";
import {
  commentMessageScheama,
  createMessageScheama,
  likeMessageScheama,
  loginSchema,
  signUpSchema,
} from "./lib/validations/schemas";
import { PrismaClient } from "@prisma/client";
import { jwt, sign } from "hono/jwt";
import type { JwtVariables } from "hono/jwt";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRETE_KEY || "";

type Variables = JwtVariables;

const app = new Hono<{ Variables: Variables }>();
const prisma = new PrismaClient();

app.use(
  "/v1/*",
  jwt({
    secret: JWT_SECRET,
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/auth/signup", async (c) => {
  try {
    const payload = await c.req.json();
    const parsed = signUpSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json({ error: "Invalid Input" });
    }

    const { username, password } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
    });

    return c.json({ success: true, id: user.id, message: "User Created" });
  } catch (err) {
    console.log(err);

    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.post("/auth/login", async (c) => {
  try {
    const payload = await c.req.json();
    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json({ error: "Invalid Input" }, 400);
    }

    const { username, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    const token = await sign(
      { userId: user.id, username: user.username },
      JWT_SECRET
    );

    return c.json({ success: true, user: { id: user.id, token } });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.post("/v1/message", async (c) => {
  try {
    const { userId } = c.get("jwtPayload");

    const payload = await c.req.json();
    const parsed = createMessageScheama.safeParse(payload);

    if (!parsed.success) {
      return c.json({ error: "Invalid Input" }, 400);
    }

    const { message } = parsed.data;

    const messageObj = await prisma.message.create({
      data: { userId, message },
    });

    return c.json({
      success: true,
      id: messageObj.id,
      message: "Message Created",
    });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/v1/messages", async (c) => {
  try {
    const { userId } = c.get("jwtPayload");

    const messages = await prisma.message.findMany({
      where: { userId },
      include: { comments: true },
    });

    if (!messages) {
      return c.json({ error: "Message not found" }, 404);
    }

    return c.json({
      success: true,
      data: messages,
      message: "Message retrived",
    });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/v1/message/:id", async (c) => {
  try {
    const messageId = parseInt(c.req.param("id"));

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { comments: true },
    });

    if (!message) {
      return c.json({ error: "Message not found" }, 404);
    }

    return c.json({
      success: true,
      data: message,
      message: "Message retrived",
    });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.post("/v1/message/like", async (c) => {
  try {
    const { userId } = c.get("jwtPayload");
    const payload = await c.req.json();
    const parsed = likeMessageScheama.safeParse(payload);

    if (!parsed.success) {
      return c.json({ error: "Invalid Input" }, 400);
    }

    const { messageId } = parsed.data;

    const likeObj = await prisma.like.findFirst({
      where: { userId, messageId },
    });

    if (likeObj) {
      return c.json({ message: "Already liked" }, 200);
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { likes: { increment: 1 } },
    });

    await prisma.like.create({
      data: { userId, messageId },
    });

    return c.json({
      success: true,
      message: "Message Liked",
    });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.post("/v1/message/:id/comment", async (c) => {
  try {
    const { userId } = c.get("jwtPayload");
    const messageId = parseInt(c.req.param("id"));
    const payload = await c.req.json();
    const parsed = commentMessageScheama.safeParse(payload);

    if (!parsed.success) {
      return c.json({ error: "Invalid Input" }, 400);
    }

    const { content } = parsed.data;

    const comment = await prisma.comment.create({
      data: { userId, messageId, content },
    });

    return c.json({
      success: true,
      id: comment.id,
      message: "Added comment",
    });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/v1/message/:id/comments", async (c) => {
  try {
    const { userId } = c.get("jwtPayload");
    const messageId = parseInt(c.req.param("id"));

    const comments = await prisma.comment.findMany({
      where: { messageId: messageId },
    });

    return c.json({
      success: true,
      data: comments,
      message: "Added comment",
    });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
const port = 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
