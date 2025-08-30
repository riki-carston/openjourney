import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt, 
      apiKey: userApiKey, 
      imageBytes, 
      model = "fal-ai/flux/dev",
      numImages = 4,
      guidanceScale = 3.5,
      aspectRatio = "1:1"
    } = await request.json();

    console.log('🎯 API /generate-images/fal received:', {
      prompt,
      hasApiKey: !!userApiKey,
      hasImageBytes: !!imageBytes,
      model,
      numImages,
      guidanceScale,
      aspectRatio
    });

    if (!prompt) {
      console.error('❌ Missing prompt');
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Use user-provided API key if available, otherwise fallback to environment variable
    const apiKey = userApiKey || process.env.FAL_KEY;
    
    if (!apiKey) {
      console.error('❌ No FAL API key available:', { hasUserApiKey: !!userApiKey, hasEnvKey: !!process.env.FAL_KEY });
      return NextResponse.json({ 
        error: "No FAL API key provided. Please add your FAL.ai API key in the settings." 
      }, { status: 401 });
    }

    // Determine the model endpoint and prepare input based on image bytes presence
    const endpoint = model;
    const input = {
      prompt,
      num_images: numImages,
      guidance_scale: guidanceScale,
      aspect_ratio: aspectRatio,
      output_format: "jpeg",
      safety_tolerance: "2"
    };

    // If image bytes are provided, use image-to-image models
    if (imageBytes && model.includes('kontext')) {
      // For FLUX Kontext (image-to-image), we need to upload the image first
      // Convert base64 image to blob URL
      const imageUrl = `data:image/png;base64,${imageBytes}`;
      (input as any).image_url = imageUrl;
      console.log('🖼️ Using image-to-image with FLUX Kontext');
    } else if (imageBytes) {
      console.log('⚠️ Image bytes provided but model does not support image-to-image, using text-only generation');
    }

    console.log('🚀 Sending request to FAL.ai with:', {
      endpoint,
      inputKeys: Object.keys(input),
      promptLength: prompt.length
    });

    // Configure FAL.ai client with API key
    fal.config({
      credentials: apiKey,
    });

    // Generate images
    const result = await fal.subscribe(endpoint, {
      input,
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          console.log('📊 FAL.ai generation progress:', update.logs?.map((log: any) => log.message).join(', '));
        }
      },
    });

    console.log('✅ FAL.ai generation completed:', {
      imagesCount: result.data.images?.length || 0,
      seed: result.data.seed
    });

    // Transform FAL.ai response to match our expected format
    const images = result.data.images?.map((img: { url: string }, index: number) => {
      // FAL.ai returns direct image URLs, we need to fetch and convert to base64
      // For now, we'll return the URLs directly and modify the frontend to handle them
      return {
        id: `${Date.now()}-${index}`,
        url: img.url, // FAL.ai provides direct image URLs
        imageBytes: null // We'll fetch and convert later if needed
      };
    }) || [];

    return NextResponse.json({ 
      success: true, 
      images,
      prompt,
      provider: 'fal.ai',
      model: endpoint,
      seed: result.data.seed
    });

  } catch (error) {
    const err = error as Error;
    console.error("💥 Error generating images with FAL.ai:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      cause: err?.cause
    });
    
    // Return more specific error information
    const errorMessage = err?.message || "Failed to generate images with FAL.ai";
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: err?.name || "Unknown error",
        provider: 'fal.ai'
      }, 
      { status: 500 }
    );
  }
}