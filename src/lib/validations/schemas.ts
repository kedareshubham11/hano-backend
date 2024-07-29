import { z } from "zod";

export const signUpSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(8).max(26),
});

export const loginSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(8).max(26),
});

export const createMessageScheama = z.object({
  message: z.string().min(1).max(255),
});

export const likeMessageScheama = z.object({
  messageId: z.number(),
});

export const commentMessageScheama = z.object({
  content: z.string().min(1).max(255),
});
