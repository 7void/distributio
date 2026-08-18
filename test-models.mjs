import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Just try to instantiate gemini-1.5-flash-latest
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("hello");
    console.log("SUCCESS with gemini-1.5-flash-latest");
  } catch(e) {
    console.log("FAILED gemini-1.5-flash-latest:", e.message);
  }
}
run();
