import { useState } from 'react';
import { Package } from 'lucide-react';
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
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <Package className="h-12 w-12 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-white", className)}>
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
