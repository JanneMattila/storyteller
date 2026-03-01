import fs from "fs";
import path from "path";
import OpenAI from "openai";

const FOUNDRY_ENDPOINT = process.env.FOUNDRY_ENDPOINT;
const FOUNDRY_API_KEY = process.env.FOUNDRY_API_KEY;
const FOUNDRY_IMAGE_MODEL =
  process.env.FOUNDRY_IMAGE_MODEL || "dall-e-3";

console.log(`Image generator configured: model=${FOUNDRY_IMAGE_MODEL} endpoint=${FOUNDRY_ENDPOINT ? FOUNDRY_ENDPOINT.substring(0, 40) + '...' : 'NOT SET'}`);

/**
 * Generate an image using Azure AI Foundry via OpenAI SDK.
 */
async function generateImage({ prompt, outputPath }) {
  if (!FOUNDRY_ENDPOINT || !FOUNDRY_API_KEY) {
    console.warn(
      "Image generation not configured. Set FOUNDRY_ENDPOINT and FOUNDRY_API_KEY in .env"
    );
    return null;
  }

  const baseURL = `${FOUNDRY_ENDPOINT.replace(/\/+$/, "")}/openai/v1/`;

  const openai = new OpenAI({
    baseURL,
    apiKey: FOUNDRY_API_KEY,
  });

  try {
    console.log(`Generating image with model=${FOUNDRY_IMAGE_MODEL}, prompt="${prompt.substring(0, 80)}..."`);

    const result = await openai.images.generate({
      model: FOUNDRY_IMAGE_MODEL,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    if (!result.data || !result.data[0]) {
      console.error("Unexpected API response:", JSON.stringify(result));
      throw new Error("Image generation returned no data");
    }

    const entry = result.data[0];

    // Ensure the output directory exists
    const dir = path.dirname(outputPath);
    await fs.promises.mkdir(dir, { recursive: true });

    if (entry.b64_json) {
      const buffer = Buffer.from(entry.b64_json, "base64");
      await fs.promises.writeFile(outputPath, buffer);
    } else if (entry.url) {
      const imgResponse = await fetch(entry.url);
      if (!imgResponse.ok) {
        throw new Error(`Failed to download image from URL (${imgResponse.status})`);
      }
      const arrayBuffer = await imgResponse.arrayBuffer();
      await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
    } else {
      console.error("Unexpected data entry:", JSON.stringify(entry));
      throw new Error("Image generation response contained neither b64_json nor url");
    }

    console.log(`Image saved: ${outputPath}`);
    return path.basename(outputPath);
  } catch (err) {
    console.error("Image generation error:", err);
    throw err;
  }
}

export { generateImage };
