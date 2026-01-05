import { useImageProcessingStore } from '@/lib/imageProcessingStore';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImageProcessingProgress() {
  const { totalImages, processedImages, processingActive } = useImageProcessingStore();

  if (totalImages === 0) return null;

  const percentage = Math.round((processedImages / totalImages) * 100);
  const isComplete = processedImages >= totalImages;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 bg-card border border-border rounded-xl shadow-lg p-4 min-w-[280px] transition-all duration-500",
        isComplete ? "animate-fade-out" : "animate-slide-in-right"
      )}
      style={{ animationDelay: isComplete ? '2000ms' : '0ms' }}
    >
      <div className="flex items-center gap-3 mb-2">
        {isComplete ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <Check className="h-4 w-4 text-primary" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 animate-pulse-glow">
            <Sparkles className="h-4 w-4 text-primary animate-spin-slow" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {isComplete ? 'Images Enhanced!' : 'Enhancing Images...'}
          </p>
          <p className="text-xs text-muted-foreground">
            {processedImages} of {totalImages} processed
          </p>
        </div>
        <span className="text-lg font-bold text-primary">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
