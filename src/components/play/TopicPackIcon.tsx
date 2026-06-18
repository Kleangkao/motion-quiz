import { useEffect, useState } from 'react';
import type { LessonImageRef } from '@/storage/types';
import { getImageUrl } from '@/storage/imageStorage';

/** Built-in topic logos — static assets under /public/packs. */
const TOPIC_PACK_LOGOS: Record<string, { src: string; alt: string }> = {
  'solana-basics': { src: '/packs/solana-logo.png', alt: 'Solana' },
  'islanddao-challenge': { src: '/packs/islanddao-logo.png', alt: 'Island DAO' },
};

const SIZE_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

interface Props {
  packId: string;
  icon?: LessonImageRef;
  title?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

function CustomTopicIcon({
  icon,
  alt,
  size,
  className,
}: {
  icon: LessonImageRef;
  alt: string;
  size: keyof typeof SIZE_CLASS;
  className: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getImageUrl(icon).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [icon]);

  if (!src) {
    return (
      <span
        className={`flex ${SIZE_CLASS[size]} shrink-0 items-center justify-center rounded-lg bg-white/10 animate-pulse ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${SIZE_CLASS[size]} shrink-0 rounded-lg object-contain ${className}`}
      draggable={false}
    />
  );
}

export function TopicPackIcon({ packId, icon, title, size = 'md', className = '' }: Props) {
  const builtIn = TOPIC_PACK_LOGOS[packId];
  if (builtIn) {
    return (
      <img
        src={builtIn.src}
        alt={builtIn.alt}
        className={`${SIZE_CLASS[size]} shrink-0 rounded-lg object-contain ${className}`}
        draggable={false}
      />
    );
  }

  if (icon) {
    return (
      <CustomTopicIcon
        icon={icon}
        alt={title ? `${title} icon` : 'Topic icon'}
        size={size}
        className={className}
      />
    );
  }

  return (
    <span
      className={`flex ${SIZE_CLASS[size]} shrink-0 items-center justify-center text-2xl leading-none ${className}`}
      aria-hidden
    >
      🎯
    </span>
  );
}
