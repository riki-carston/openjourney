import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey: userApiKey } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Use user-provided API key if available, otherwise fallback to environment variable
    const apiKey = userApiKey || process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: "No API key provided. Please add your Google AI API key in the settings." 
      }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log("Generating images for prompt:", prompt);

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-preview-06-06',
      prompt: prompt,
      config: {
        numberOfImages: 4,
      },
    });

    // Convert image bytes to base64 data URLs for frontend display
    const images = (response.generatedImages || []).map((generatedImage, index) => {
      const imageBytes = generatedImage.image?.imageBytes;
      if (!imageBytes) return null;
      const base64 = `data:image/png;base64,${imageBytes}`;
      return {
        id: `${Date.now()}-${index}`,
        url: base64,
        imageBytes: imageBytes // Keep for potential video conversion
      };
    }).filter(Boolean);

    return NextResponse.json({ 
      success: true, 
      images,
      prompt 
    });

  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: "Failed to generate images" }, 
      { status: 500 }
    );
  }
} 