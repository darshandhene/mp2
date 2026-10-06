import { useState } from "react";
import styles from "./MealImage.module.css";

type MealImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export function MealImage({ src, alt, className, loading = "lazy" }: MealImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    const fallbackClass = [styles.fallback, className].filter(Boolean).join(" ");
    if (!alt) {
      return (
        <span className={fallbackClass} aria-hidden="true">
          No photo
        </span>
      );
    }
    return (
      <span className={fallbackClass} role="img" aria-label={alt}>
        No photo
      </span>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  );
}
