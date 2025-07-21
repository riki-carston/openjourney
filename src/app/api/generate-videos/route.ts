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

    console.log("Generating videos for prompt:", prompt);

    let operation = await ai.models.generateVideos({
      model: "veo-3.0-generate-preview",
      prompt: prompt,
      config: {
        personGeneration: "allow_all",
        aspectRatio: "16:9",
      },
    });

    // Poll for completion (in production, you'd want to use webhooks or job queues)
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max

    while (!operation.done && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
      attempts++;
      console.log(`Video generation attempt ${attempts}, done: ${operation.done}`);
    }

    if (!operation.done) {
      return NextResponse.json(
        { error: "Video generation timed out" }, 
        { status: 408 }
      );
    }

    // Fetch video URLs and convert to accessible format
    const videos = await Promise.all(
      operation.response?.generatedVideos?.map(async (generatedVideo, index) => {
        const videoUri = generatedVideo.video?.uri;
        if (videoUri) {
          // In production, you'd download and serve these files properly
          // For now, we'll return the URI with API key
          const urlWithKey = `${videoUri}&key=${apiKey}`;
          return {
            id: `${Date.now()}-${index}`,
            url: urlWithKey,
            uri: videoUri
          };
        }
        return null;
      }).filter(Boolean) || []
    );

    return NextResponse.json({ 
      success: true, 
      videos,
      prompt 
    });

  } catch (error) {
    console.error("Error generating videos:", error);
    return NextResponse.json(
      { error: "Failed to generate videos" }, 
      { status: 500 }
    );
  }
} 