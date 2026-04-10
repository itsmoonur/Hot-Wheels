import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CarAttributes {
  make: string;
  model: string;
  color: string;
  style: string;
  packagingStyle: string;
}

export const analyzeCarImage = async (base64Image: string, mimeType: string): Promise<Partial<CarAttributes>> => {
  const imagePart = {
    inlineData: {
      mimeType,
      data: base64Image.split(",")[1],
    },
  };

  const prompt = `Analyze this car image and provide the following details in JSON format:
  {
    "make": "The brand of the car, e.g., Nissan, Ford, BMW",
    "model": "The specific model name, e.g., Skyline GT-R, Mustang, M3",
    "color": "The primary color of the car",
    "style": "One of: Classic, Street Racer, Cyberpunk, Off-road, Vintage"
  }`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse analysis response", e);
    return {};
  }
};

export const generateToyPackaging = async (attributes: CarAttributes, base64Image?: string): Promise<string> => {
  const prompt = `
TASK: Generate a hyper-realistic "Hot Wheels" style blister card toy packaging mockup.

PRODUCT DETAILS:
- Car: ${attributes.make} ${attributes.model}
- Color: ${attributes.color}
- Car Style: ${attributes.style}
- Packaging Theme: ${attributes.packagingStyle}

PACKAGING COMPOSITION:
- A classic die-cast car blister card (cardboard backer + plastic bubble).
- The car (${attributes.make} ${attributes.model}) is visible inside the clear plastic blister.
- The cardboard backer features dynamic artwork of the car matching the "${attributes.packagingStyle}" theme.
- Branding: Include a stylized "HOT WHEELS" inspired logo at the top.
- Text: The bottom of the card clearly displays "${attributes.make} ${attributes.model}" in a bold, clean font.
- Background: A clean, studio-lit environment or a thematic background matching the "${attributes.packagingStyle}" theme.

PACKAGING THEME DETAILS:
- Mainline: Classic blue/orange Hot Wheels aesthetic, clean and commercial.
- Treasure Hunt: Rare edition look, metallic accents, special "flame" logo details.
- Retro Entertainment: 80s/90s movie poster style artwork, nostalgic colors.
- Premium Real Riders: High-end collector look, matte finish card, highly detailed car art.
- Anniversary Edition: Gold and black elegant theme, celebratory graphics.
- Nightburnerz: Dark, urban, neon-lit street racing aesthetic.
- Super Treasure Hunt: Ultra-premium look, spectraflame paint effects, rubber tire details in art, "TH" logo.
- Boulevard: Urban street culture aesthetic, realistic city street backgrounds.
- Car Culture: Highly detailed thematic sets (like Japan Historics), premium artistic card art.
- Team Transport: Racing team aesthetic, includes a hauler/truck in the background artwork.

LIGHTING & TEXTURE:
- Professional product photography lighting.
- Realistic plastic reflections on the blister.
- Cardboard texture on the backer.
- High-resolution, sharp focus (8k).

NEGATIVE PROMPT:
- No blurry images, no distorted car shapes, no messy text, no real-world copyright logos other than stylized generic ones.
  `;

  const contents: any = {
    parts: [{ text: prompt }]
  };

  if (base64Image) {
    contents.parts.push({
      inlineData: {
        mimeType: "image/png",
        data: base64Image.split(",")[1],
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents,
    config: {
      imageConfig: {
        aspectRatio: "3:4", // More like a blister card
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to generate image");
};
