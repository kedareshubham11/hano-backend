import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import {
  commentMessageScheama,
  createMessageScheama,
  likeMessageScheama,
} from "../lib/validations/schemas";

const message = new Hono();
const prisma = new PrismaClient();

message.post("/", async (c) => {
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

message.get("/", async (c) => {
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

message.get("/:id", async (c) => {
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

message.post("/like", async (c) => {
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

message.post("/:id/comment", async (c) => {
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

message.get("/:id/comments", async (c) => {
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

export default message;
