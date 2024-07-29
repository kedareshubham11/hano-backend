import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { jwt, sign } from "hono/jwt";
import bcrypt from "bcryptjs";
import { loginSchema, signUpSchema } from "../lib/validations/schemas";

const JWT_SECRET = process.env.JWT_SECRETE_KEY || "";

const auth = new Hono();
const prisma = new PrismaClient();

auth.post("/signup", async (c) => {
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

auth.post("/login", async (c) => {
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

export default auth;
