import OpenAI from "openai";

declare global {
  // eslint-disable-next-line no-var
  var __marketforgeOpenAI: OpenAI | undefined;
}

export const openai =
  global.__marketforgeOpenAI ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  global.__marketforgeOpenAI = openai;
}