import { useState } from "react";
import styles from "./MealImage.module.css";

type MealImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

export function MealImage({ src, alt, className }: MealImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;
  if (!showImage || !src) {
    return (
      <span className={[styles.fallback, className].filter(Boolean).join(" ")} role="img" aria-label={alt || "No photo"}>
        No photo
      </span>
    );
  }
  return <img className={className} src={src} alt={alt} onError={() => setFailedSrc(src)} />;
}
