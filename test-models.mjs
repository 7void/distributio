import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "node:fs";

if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const [key, ...rest] = line.trim().split("=");
    if (key && rest.length > 0 && !process.env[key]) {
      process.env[key] = rest.join("=");
    }
  }
}

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("hello");
    console.log(`SUCCESS with ${modelName}`);
  } catch(e) {
    console.log(`FAILED ${modelName}:`, e.message);
  }
}
run();
