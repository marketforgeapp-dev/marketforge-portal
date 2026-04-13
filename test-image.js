import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testImage() {
  try {
    console.log("OPENAI_API_KEY found:", !!process.env.OPENAI_API_KEY);

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: "A professional plumber fixing a kitchen sink, realistic, well-lit",
      size: "1024x1024",
    });

    console.log("SUCCESS ✅");
    console.log(result.data[0]);
  } catch (error) {
    console.error("ERROR ❌");
    console.error(error);
  }
}

testImage();