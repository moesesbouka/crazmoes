import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { proxyImageUrl } from '@/lib/proxyImage';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  showProcessingIndicator?: boolean;
  facebookId?: string;
  imageIndex?: number;
}

export function ProductImage({
  src,
  alt,
  className,
  facebookId,
  imageIndex = 0,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={cn("flex items-center justify-center bg-secondary", className)}>
        <Package className="h-12 w-12 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      <img
        src={proxyImageUrl(src, facebookId, imageIndex)}
        alt={alt}
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
