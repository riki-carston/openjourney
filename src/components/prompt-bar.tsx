"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, UploadIcon, X } from "lucide-react";
import { SettingsDropdown, type ProviderSettings } from "@/components/settings-dropdown";
import Image from "next/image";

interface PromptBarProps {
  onGenerate?: (type: "image" | "video", prompt: string, imageBytes?: string) => void;
  providerSettingsHandler?: ((settings: ProviderSettings) => void) | null;
}

export function PromptBar({ onGenerate, providerSettingsHandler }: PromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a PNG, JPG, or WebP image');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setUploadedImage(file);
    setUploadError(null);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async (type: "image" | "video") => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      let imageBytes: string | undefined;
      if (uploadedImage) {
        console.log('🔍 Processing uploaded image:', uploadedImage.name, uploadedImage.size);
        imageBytes = await convertFileToBase64(uploadedImage);
        console.log('✅ Image converted to base64, length:', imageBytes?.length);
      } else {
        console.log('ℹ️ No image uploaded, proceeding with text-only generation');
      }

      // Call the parent handler to add new generation
      if (onGenerate) {
        console.log('📤 Calling onGenerate with:', { type, prompt: prompt.trim(), hasImageBytes: !!imageBytes });
        onGenerate(type, prompt.trim(), imageBytes);
      }
      
      // Clear the prompt and image
      setPrompt("");
      handleRemoveImage();
      
    } catch (error) {
      console.error('Error processing image:', error);
      setUploadError('Failed to process image');
    } finally {
      // Reset generating state
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate("image"); // Default to image on Enter
    }
  };

  return (
    <div className="w-full py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4">
          {/* Image preview section */}
          {imagePreview && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={imagePreview}
                  alt="Upload preview"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadedImage?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {uploadedImage && `${(uploadedImage.size / 1024 / 1024).toFixed(1)}MB`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemoveImage}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Error message */}
          {uploadError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{uploadError}</p>
            </div>
          )}

          {/* Main prompt input */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* OpenJourney Logo */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <Image 
                src="/images/logo.png" 
                alt="Wealthie Images Logo" 
                width={32} 
                height={32}
                className="rounded-full"
              />
              <h2>Wealthie Images</h2>
            </div>
            
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Describe what you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-2 sm:pr-44 h-12 text-base bg-card border-input"
                disabled={isGenerating}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="h-8 px-2"
                  title="Upload image"
                >
                  <UploadIcon className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerate("image")}
                  disabled={!prompt.trim() || isGenerating}
                  className="h-8"
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Image
                </Button>
{/* Video generation temporarily hidden
                <Button
                  size="sm"
                  onClick={() => handleGenerate("video")}
                  disabled={!prompt.trim() || isGenerating}
                  className="h-8"
                >
                  <VideoIcon className="w-4 h-4 mr-1" />
                  Video
                </Button>
                */}
                <SettingsDropdown onProviderChange={providerSettingsHandler || undefined} />
              </div>
            </div>
          </div>

          {/* Mobile buttons row */}
          <div className="flex sm:hidden gap-2 justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className="px-3 h-10"
              title="Upload image"
            >
              <UploadIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerate("image")}
              disabled={!prompt.trim() || isGenerating}
              className="flex-1 h-10"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Image
            </Button>
{/* Video generation temporarily hidden
            <Button
              onClick={() => handleGenerate("video")}
              disabled={!prompt.trim() || isGenerating}
              className="flex-1 h-10"
            >
              <VideoIcon className="w-4 h-4 mr-2" />
              Video
            </Button>
            */}
            <SettingsDropdown onProviderChange={providerSettingsHandler || undefined} />
          </div>


        </div>
      </div>
    </div>
  );
} 