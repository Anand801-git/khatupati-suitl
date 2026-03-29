import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { loadMediaLocally } from '@/lib/media-store';
import { Loader2 } from 'lucide-react';

interface LocalImageProps {
  uri?: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function LocalImage({ uri, alt, className, fallback }: LocalImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchImage = async () => {
      if (!uri) {
        setLoading(false);
        return;
      }
      
      try {
        const base64 = await loadMediaLocally(uri);
        if (mounted) {
          setSrc(base64);
        }
      } catch (e) {
        console.error("Failed to load local media", e);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    fetchImage();
    
    return () => {
      mounted = false;
    };
  }, [uri]);

  if (!uri && fallback) {
    return <>{fallback}</>;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground opacity-50" />
      </div>
    );
  }

  if (!src && fallback) {
    return <>{fallback}</>;
  }

  if (!src) {
    return <div className={`bg-muted ${className}`} />;
  }

  return (
    <Image 
      src={src} 
      alt={alt} 
      fill 
      className={className} 
      unoptimized // Required for base64 data URIs
    />
  );
}
