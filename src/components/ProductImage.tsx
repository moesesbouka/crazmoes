import { useState, useEffect } from 'react';
import { removeBackground } from '@/lib/backgroundRemoval';
import { getCachedImage, setCachedImage } from '@/lib/imageCache';
import { useImageProcessingStore } from '@/lib/imageProcessingStore';
import { Package, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  showProcessingIndicator?: boolean;
}

export function ProductImage({ 
  src, 
  alt, 
  className,
  showProcessingIndicator = true 
}: ProductImageProps) {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const incrementProcessed = useImageProcessingStore((state) => state.incrementProcessed);

  useEffect(() => {
    let mounted = true;

    async function processImage() {
      if (!src) return;

      try {
        // Check cache first
        const cached = await getCachedImage(src);
        if (cached && mounted) {
          setProcessedSrc(cached);
          incrementProcessed();
          return;
        }

        // Process the image
        setIsProcessing(true);
        const processed = await removeBackground(src);
        
        if (mounted) {
          setProcessedSrc(processed);
          // Cache the result
          await setCachedImage(src, processed);
          incrementProcessed();
        }
      } catch (error) {
        console.error('Failed to process image:', error);
        if (mounted) {
          setHasError(true);
          incrementProcessed();
        }
      } finally {
        if (mounted) {
          setIsProcessing(false);
        }
      }
    }

    processImage();

    return () => {
      mounted = false;
    };
  }, [src, incrementProcessed]);

  // Show original image while processing or on error
  const displaySrc = processedSrc || src;
  const showLoader = isProcessing && !processedSrc;

  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <Package className="h-12 w-12 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Loading skeleton */}
      {showLoader && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="animate-pulse-glow">
            <Sparkles className="h-8 w-8 text-primary animate-spin-slow" />
          </div>
          {showProcessingIndicator && (
            <span className="mt-2 text-xs text-muted-foreground animate-pulse">
              Enhancing...
            </span>
          )}
        </div>
      )}

      {/* The image */}
      <img
        src={displaySrc}
        alt={alt}
        className={cn(
          "h-full w-full object-contain transition-opacity duration-500",
          showLoader ? "opacity-30" : "opacity-100",
          !hasError && processedSrc ? "bg-background" : ""
        )}
        style={{ backgroundColor: 'hsl(var(--background))' }}
      />
    </div>
  );
}
