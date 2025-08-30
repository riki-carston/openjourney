import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey: userApiKey, imageBytes } = await request.json();

    console.log('🎯 API /generate-images received:', {
      prompt,
      hasApiKey: !!userApiKey,
      hasImageBytes: !!imageBytes,
      imageBytesLength: imageBytes?.length,
      imageBytesPreview: imageBytes ? imageBytes.substring(0, 50) + '...' : 'none'
    });

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

    // Generate 4 images using Gemini 2.5 Flash Image model
    // Support both text-to-image and image-to-image generation
    const imagePromises = Array.from({ length: 4 }, async (_, index) => {
      try {
        // Prepare content parts based on whether we have an input image
        const contentParts = [{ text: prompt }];
        if (imageBytes) {
          console.log(`🖼️ Adding image data to request ${index + 1}, imageBytes length:`, imageBytes.length);
          contentParts.push({
            inlineData: {
              mimeType: "image/png",
              data: imageBytes
            }
          });
        } else {
          console.log(`📝 Text-only generation for request ${index + 1}`);
        }

        console.log(`🚀 Sending request ${index + 1} to Gemini with ${contentParts.length} parts`);

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image-preview",
          contents: [{ parts: contentParts }],
        });

        // Extract image data from the response
        const candidates = response.candidates || [];
        for (const candidate of candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData?.data) {
                const imageBytes = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
                const base64 = `data:${mimeType};base64,${imageBytes}`;
                
                return {
                  id: `${Date.now()}-${index}`,
                  url: base64,
                  imageBytes: imageBytes
                };
              }
            }
          }
        }
        
        console.warn(`⚠️  No image data found in response for image ${index + 1}`);
        return null;
      } catch (error) {
        console.warn(`⚠️  Failed to generate image ${index + 1}:`, error);
        return null;
      }
    });
    
    // Wait for all image generation requests to complete
    const generatedImages = await Promise.all(imagePromises);
    const images = generatedImages.filter(Boolean);

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