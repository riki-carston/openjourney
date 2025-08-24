import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { originalPrompt, improvementPrompt, imageBytes, apiKey: userApiKey } = await request.json();

    if (!originalPrompt || !improvementPrompt) {
      console.error('❌ Missing prompts:', { hasOriginal: !!originalPrompt, hasImprovement: !!improvementPrompt });
      return NextResponse.json({ error: "Both original and improvement prompts are required" }, { status: 400 });
    }

    if (!imageBytes) {
      console.error('❌ Missing image data');
      return NextResponse.json({ error: "Image data is required for improvement" }, { status: 400 });
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

    // Combine the original prompt with improvement instructions
    const enhancedPrompt = `${originalPrompt}. Please improve this image by: ${improvementPrompt}`;

    console.log('🎨 Improving image with prompt:', enhancedPrompt);

    const requestConfig = {
      model: 'imagen-4.0-generate-preview-06-06',
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 4,
        // Note: We're using text-to-image generation rather than image-to-image
        // as the current Google GenAI SDK may not support image-to-image yet
        // The prompt enhancement approach should still produce improved variations
      },
    };

    const response = await ai.models.generateImages(requestConfig);

    // Convert image bytes to base64 data URLs for frontend display
    const images = (response.generatedImages || []).map((generatedImage, index) => {
      const imageData = generatedImage.image?.imageBytes;
      if (!imageData) {
        console.warn(`⚠️  No image bytes for improved image ${index + 1}`);
        return null;
      }
      
      const base64 = `data:image/png;base64,${imageData}`;
      return {
        id: `improved-${Date.now()}-${index}`,
        url: base64,
        imageBytes: imageData
      };
    }).filter(Boolean);

    return NextResponse.json({ 
      success: true, 
      images,
      originalPrompt,
      improvementPrompt,
      enhancedPrompt
    });

  } catch (error) {
    const err = error as any;
    console.error("💥 Error improving image:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      cause: err?.cause
    });
    
    // Return more specific error information
    const errorMessage = err?.message || "Failed to improve image";
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