import { experimental_generateImage as generateImage } from "ai";
import { openai } from "@ai-sdk/openai";

const { image } = await generateImage({
  model: openai.image("dall-e-3"),
  prompt: "Santa Claus driving a Cadillac",
});
