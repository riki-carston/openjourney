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

    // Create the improvement prompt for image-to-image generation
    const enhancedPrompt = `Please improve this image by: ${improvementPrompt}`;

    // Generate 4 images using Gemini 2.5 Flash Image model with image input
    const imagePromises = Array.from({ length: 4 }, async (_, index) => {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image-preview",
          contents: [
            {
              parts: [
                { text: enhancedPrompt },
                { 
                  inlineData: { 
                    mimeType: "image/png", 
                    data: imageBytes 
                  }
                }
              ]
            }
          ]
        });

        // Extract image data from the response
        const candidates = response.candidates || [];
        for (const candidate of candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData?.data) {
                const generatedImageBytes = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
                const base64 = `data:${mimeType};base64,${generatedImageBytes}`;
                
                return {
                  id: `improved-${Date.now()}-${index}`,
                  url: base64,
                  imageBytes: generatedImageBytes
                };
              }
            }
          }
        }
        
        console.warn(`⚠️  No image data found in response for improved image ${index + 1}`);
        return null;
      } catch (error) {
        console.warn(`⚠️  Failed to generate improved image ${index + 1}:`, error);
        return null;
      }
    });
    
    // Wait for all image improvement requests to complete
    const generatedImages = await Promise.all(imagePromises);
    const images = generatedImages.filter(Boolean);

    return NextResponse.json({ 
      success: true, 
      images,
      originalPrompt,
      improvementPrompt,
      enhancedPrompt
    });

  } catch (error) {
    const err = error as Error;
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