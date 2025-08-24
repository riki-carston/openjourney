import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey: userApiKey } = await request.json();

    if (!prompt) {
      console.error('❌ Missing prompt');
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Use user-provided API key if available, otherwise fallback to environment variable
    const apiKey = userApiKey || process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ No API key available:', { hasUserApiKey: !!userApiKey, hasEnvKey: !!process.env.GOOGLE_AI_API_KEY });
      return NextResponse.json({ 
        error: "No API key provided. Please add your Google AI API key in the settings." 
      }, { status: 401 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const requestConfig = {
      model: 'imagen-4.0-generate-preview-06-06',
      prompt: prompt,
      config: {
        numberOfImages: 4,
      },
    };

    const response = await ai.models.generateImages(requestConfig);

    // Convert image bytes to base64 data URLs for frontend display
    const images = (response.generatedImages || []).map((generatedImage, index) => {
      
      const imageBytes = generatedImage.image?.imageBytes;
      if (!imageBytes) {
        console.warn(`⚠️  No image bytes for image ${index + 1}`);
        return null;
      }
      
      const base64 = `data:image/png;base64,${imageBytes}`;
      return {
        id: `${Date.now()}-${index}`,
        url: base64,
        imageBytes: imageBytes
      };
    }).filter(Boolean);

    return NextResponse.json({ 
      success: true, 
      images,
      prompt 
    });

  } catch (error) {
    const err = error as Error;
    console.error("💥 Error generating images:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      cause: err?.cause
    });
    
    // Return more specific error information
    const errorMessage = err?.message || "Failed to generate images";
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: err?.name || "Unknown error"
      }, 
      { status: 500 }
    );
  }
} 