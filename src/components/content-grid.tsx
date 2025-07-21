"use client";

import { useState, useEffect } from "react";
import { ImageGrid } from "@/components/image-grid";
import { VideoGrid } from "@/components/video-grid";
import { LoadingGrid } from "@/components/loading-grid";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import { FocusedMediaView } from "@/components/focused-media-view";
import { motion } from "framer-motion";

interface ImageGeneration {
  id: string;
  prompt: string;
  images: Array<{
    url: string;
    imageBytes?: string;
    isSample?: boolean;
  }>;
  timestamp: Date;
  isLoading: boolean;
}

interface VideoGeneration {
  id: string;
  prompt: string;
  videos: string[];
  timestamp: Date;
  isLoading: boolean;
  sourceImage?: string;
}

interface LoadingGeneration {
  id: string;
  prompt: string;
  type: "image" | "video";
  timestamp: Date;
  isLoading: true;
  sourceImage?: string;
}

type Generation = ImageGeneration | VideoGeneration | LoadingGeneration;

// Sample data for demonstration with real generated content
const createSampleGenerations = (): Generation[] => [
  // Video generation (most recent)
  {
    id: "sample-video-1",
    prompt: "a race car formula 1 style in a highspeed track",
    videos: [
      "/sample-videos/video-1.mp4",
      "/sample-videos/video-2.mp4"
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
    isLoading: false
  } as VideoGeneration,
  // Image generation 
  {
    id: "sample-image-1",
    prompt: "A majestic ice warrior in blue armor standing in a snowy landscape",
    images: [
      { url: "/sample-images/generated-image-1.png", isSample: true },
      { url: "/sample-images/generated-image-2.png", isSample: true }, 
      { url: "/sample-images/generated-image-3.png", isSample: true },
      { url: "/sample-images/generated-image-4.png", isSample: true }
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    isLoading: false
  } as ImageGeneration
];

export function ContentGrid({ 
  onNewGeneration,
  onImageToVideo 
}: { 
  onNewGeneration?: (handler: (type: "image" | "video", prompt: string) => void) => void;
  onImageToVideo?: (handler: (imageUrl: string, imageBytes: string, prompt: string) => void) => void;
}) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [focusedView, setFocusedView] = useState<{
    isOpen: boolean;
    mediaItems: Array<{
      id: string;
      type: 'image' | 'video';
      url: string;
      prompt: string;
      timestamp: Date;
      sourceImage?: string;
    }>;
    initialIndex: number;
  }>({ isOpen: false, mediaItems: [], initialIndex: 0 });

  // Initialize with sample data after mount to avoid hydration issues
  useEffect(() => {
    setGenerations(createSampleGenerations());
  }, []);

  // Helper function to gather all media items from generations
  const getAllMediaItems = () => {
    const mediaItems: Array<{
      id: string;
      type: 'image' | 'video';
      url: string;
      prompt: string;
      timestamp: Date;
      sourceImage?: string;
    }> = [];

    generations.forEach((generation) => {
      if (!generation.isLoading) {
        if ('images' in generation) {
          // Image generation
          generation.images.forEach((image, index) => {
            mediaItems.push({
              id: `${generation.id}-img-${index}`,
              type: 'image',
              url: image.url,
              prompt: generation.prompt,
              timestamp: generation.timestamp,
            });
          });
        } else if ('videos' in generation) {
          // Video generation
          generation.videos.forEach((video, index) => {
            mediaItems.push({
              id: `${generation.id}-vid-${index}`,
              type: 'video',
              url: video,
              prompt: generation.prompt,
              timestamp: generation.timestamp,
              sourceImage: generation.sourceImage,
            });
          });
        }
      }
    });

    // Sort by timestamp (newest first)
    return mediaItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  // Function to open focused view
  const openFocusedView = (generationId: string, itemIndex: number) => {
    const allMediaItems = getAllMediaItems();
    
    // Find the specific item index in the global list
    let globalIndex = 0;
    for (let i = 0; i < generations.length; i++) {
      const gen = generations[i];
      if (gen.isLoading) continue;
      
      if (gen.id === generationId) {
        globalIndex += itemIndex;
        break;
      }
      
      if ('images' in gen) {
        globalIndex += gen.images.length;
      } else if ('videos' in gen) {
        globalIndex += gen.videos.length;
      }
    }

    setFocusedView({
      isOpen: true,
      mediaItems: allMediaItems,
      initialIndex: globalIndex,
    });
  };

  const handleNewGeneration = async (type: "image" | "video", prompt: string) => {
    // Get user's API key from localStorage
    const userApiKey = localStorage.getItem("gemini_api_key");
    
    const loadingGeneration: LoadingGeneration = {
      id: `loading-${Date.now()}`,
      prompt,
      type,
      timestamp: new Date(),
      isLoading: true
    };

    // Add new loading generation at the top
    setGenerations(prev => [loadingGeneration, ...prev]);

    try {
      if (type === "image") {
        // Call Imagen API
        const response = await fetch('/api/generate-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, apiKey: userApiKey }),
        });

        const data = await response.json();

        if (data.success) {
          const completedGeneration: ImageGeneration = {
            id: loadingGeneration.id,
            prompt: loadingGeneration.prompt,
            images: data.images.map((img: { url: string; imageBytes: string }) => ({
              url: img.url,
              imageBytes: img.imageBytes
            })),
            timestamp: loadingGeneration.timestamp,
            isLoading: false
          };

          setGenerations(prev => prev.map(gen => 
            gen.id === loadingGeneration.id ? completedGeneration : gen
          ));
        } else {
          throw new Error(data.error || 'Image generation failed');
        }
      } else {
        // Call Veo 3 API for text-to-video
        const response = await fetch('/api/generate-videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, apiKey: userApiKey }),
        });

        const data = await response.json();

        if (data.success) {
          const completedGeneration: VideoGeneration = {
            id: loadingGeneration.id,
            prompt: loadingGeneration.prompt,
            videos: data.videos.map((vid: { url: string }) => vid.url),
            timestamp: loadingGeneration.timestamp,
            isLoading: false
          };

          setGenerations(prev => prev.map(gen => 
            gen.id === loadingGeneration.id ? completedGeneration : gen
          ));
        } else {
          throw new Error(data.error || 'Video generation failed');
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      // Remove the loading generation on error
      setGenerations(prev => prev.filter(gen => gen.id !== loadingGeneration.id));
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      if (errorMessage.includes('API key')) {
        setShowApiKeyDialog(true);
      } else {
        alert(`Generation failed: ${errorMessage}`);
      }
    }
  };

  const handleImageToVideo = async (imageUrl: string, imageBytes: string, prompt: string) => {
    // Get user's API key from localStorage
    const userApiKey = localStorage.getItem("gemini_api_key");
    
    const loadingGeneration: LoadingGeneration = {
      id: `video-loading-${Date.now()}`,
      prompt: `${prompt} - animated video`,
      type: "video",
      timestamp: new Date(),
      isLoading: true,
      sourceImage: imageUrl
    };

    // Add new loading generation at the top
    setGenerations(prev => [loadingGeneration, ...prev]);

    try {
      const response = await fetch('/api/image-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: `${prompt} - animated video`,
          imageBytes,
          apiKey: userApiKey
        }),
      });

      const data = await response.json();

      if (data.success) {
        const completedGeneration: VideoGeneration = {
          id: loadingGeneration.id,
          prompt: loadingGeneration.prompt,
          videos: data.videos.map((vid: { url: string }) => vid.url),
          timestamp: loadingGeneration.timestamp,
          isLoading: false,
          sourceImage: imageUrl
        };

        setGenerations(prev => prev.map(gen => 
          gen.id === loadingGeneration.id ? completedGeneration : gen
        ));
      } else {
        throw new Error(data.error || 'Video conversion failed');
      }
    } catch (error) {
      console.error('Video conversion failed:', error);
      // Remove the loading generation on error
      setGenerations(prev => prev.filter(gen => gen.id !== loadingGeneration.id));
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Video conversion failed';
      if (errorMessage.includes('API key')) {
        setShowApiKeyDialog(true);
      } else {
        alert(`Video conversion failed: ${errorMessage}`);
      }
    }
  };

  // Use useEffect to avoid setState during render
  useEffect(() => {
    if (onNewGeneration) {
      onNewGeneration(handleNewGeneration);
    }
    if (onImageToVideo) {
      onImageToVideo(handleImageToVideo);
    }
  }, [onNewGeneration, onImageToVideo]);

  return (
    <>
      <div className="space-y-8">
      {generations.map((generation) => (
        <motion.div
          key={generation.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {generation.isLoading ? (
            <LoadingGrid 
              prompt={generation.prompt}
              type={"type" in generation ? generation.type : "image"}
              sourceImage={"sourceImage" in generation ? generation.sourceImage : undefined}
            />
          ) : "images" in generation ? (
            <ImageGrid 
              generation={generation}
              onImageToVideo={handleImageToVideo}
              onViewFullscreen={openFocusedView}
            />
          ) : (
            <VideoGrid 
              generation={generation} 
              onViewFullscreen={openFocusedView}
            />
          )}
        </motion.div>
      ))}
      
      {generations.length === 0 && (
        <div className="text-center py-16">
          <h3 className="text-lg font-medium mb-2">Ready to create something amazing?</h3>
          <p className="text-muted-foreground">
            Use the prompt bar above to generate your first image or video.
          </p>
        </div>
      )}
    </div>

      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onApiKeySaved={() => {
          console.log('Google Gemini API key saved successfully');
          // Trigger a custom event to notify settings dropdown to refresh
          window.dispatchEvent(new CustomEvent('apiKeyUpdated'));
        }}
      />

      <FocusedMediaView
        isOpen={focusedView.isOpen}
        onClose={() => setFocusedView(prev => ({ ...prev, isOpen: false }))}
        mediaItems={focusedView.mediaItems}
        initialIndex={focusedView.initialIndex}
        onImageToVideo={handleImageToVideo}
      />
    </>
  );
} 