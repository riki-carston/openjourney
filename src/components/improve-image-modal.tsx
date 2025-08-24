"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SparklesIcon, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImproveImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  originalPrompt: string;
  onImproveImage: (improvementPrompt: string) => void;
}

export function ImproveImageModal({ 
  open, 
  onOpenChange, 
  imageUrl, 
  originalPrompt, 
  onImproveImage 
}: ImproveImageModalProps) {
  const [improvementPrompt, setImprovementPrompt] = useState('');
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async () => {
    if (!improvementPrompt.trim()) return;
    
    setIsImproving(true);
    try {
      await onImproveImage(improvementPrompt.trim());
      
      // Close dialog and reset form
      onOpenChange(false);
      setImprovementPrompt('');
    } catch (error) {
      console.error('Error improving image:', error);
    } finally {
      setIsImproving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleImprove();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <SparklesIcon className="w-5 h-5" />
            Improve Image
          </DialogTitle>
          <DialogDescription className="text-center">
            Describe how you&apos;d like to improve this image. Be specific about what you want changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Image Preview */}
          <div className="flex justify-center">
            <div className="relative w-48 h-48 rounded-lg overflow-hidden border">
              <Image
                src={imageUrl}
                alt="Image to improve"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Original Prompt */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="w-4 h-4" />
              Original Prompt
            </Label>
            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
              {originalPrompt}
            </div>
          </div>

          {/* Improvement Prompt */}
          <div className="space-y-2">
            <Label htmlFor="improvement-prompt" className="text-sm font-medium">
              What would you like to improve?
            </Label>
            <textarea
              id="improvement-prompt"
              placeholder="e.g., make the background darker and add more dramatic lighting, sharpen the edges, change the color scheme to be more vibrant..."
              value={improvementPrompt}
              onChange={(e) => setImprovementPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50 resize-vertical"
              )}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Press Cmd+Enter to improve the image quickly
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImprove}
              disabled={!improvementPrompt.trim() || isImproving}
              className="flex-1"
            >
              {isImproving ? (
                <>
                  <SparklesIcon className="w-4 h-4 mr-2 animate-spin" />
                  Improving...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  Improve Image
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground text-center">
            This will generate 4 new improved versions based on your original image and suggestions.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}