'use client';

import { useState, useEffect, useCallback } from 'react';

// Check if an image is mostly a single color (blank/white/solid)
function isBlankImage(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement('canvas');
    const size = 20; // sample at small size for performance
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    // Check if >95% of pixels are similar to the first pixel
    const [r0, g0, b0] = [data[0], data[1], data[2]];
    let sameCount = 0;
    const total = size * size;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - r0) < 15 && Math.abs(data[i + 1] - g0) < 15 && Math.abs(data[i + 2] - b0) < 15) {
        sameCount++;
      }
    }
    return sameCount / total > 0.95;
  } catch {
    return false;
  }
}

// Category → gradient + emoji mapping for default covers
const CATEGORY_STYLES: Record<string, { gradient: string; emoji: string }> = {
  '文学小说': { gradient: 'from-rose-400 to-pink-600', emoji: '📖' },
  '商业管理': { gradient: 'from-blue-400 to-indigo-600', emoji: '💼' },
  '科技创新': { gradient: 'from-cyan-400 to-blue-600', emoji: '🚀' },
  '心理学': { gradient: 'from-purple-400 to-violet-600', emoji: '🧠' },
  '历史人文': { gradient: 'from-amber-400 to-orange-600', emoji: '🏛️' },
  '哲学思想': { gradient: 'from-indigo-400 to-purple-600', emoji: '💭' },
  '自我成长': { gradient: 'from-emerald-400 to-teal-600', emoji: '🌱' },
  '社会科学': { gradient: 'from-teal-400 to-cyan-600', emoji: '🌍' },
  '艺术设计': { gradient: 'from-pink-400 to-rose-600', emoji: '🎨' },
  '科普读物': { gradient: 'from-green-400 to-emerald-600', emoji: '🔬' },
};

const DEFAULT_STYLE = { gradient: 'from-indigo-400 to-purple-600', emoji: '📚' };

interface BookCoverProps {
  title: string;
  author: string;
  category: string;
  coverUrl?: string;
  onCoverLoaded?: (url: string) => void;
}

export default function BookCover({ title, author, category, coverUrl, onCoverLoaded }: BookCoverProps) {
  const [imgUrl, setImgUrl] = useState(coverUrl || '');
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(!coverUrl);

  useEffect(() => {
    if (coverUrl) {
      setImgUrl(coverUrl);
      setLoading(false);
      return;
    }

    // Fetch cover from API
    let cancelled = false;
    fetch(`/api/book-cover?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.coverUrl) {
          setImgUrl(data.coverUrl);
          onCoverLoaded?.(data.coverUrl);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [title, author, coverUrl, onCoverLoaded]);

  const style = CATEGORY_STYLES[category] || DEFAULT_STYLE;

  const cleanTitle = title.replace(/[《》]/g, '');
  const showImg = imgUrl && !imgError;

  // Fallback layer (always rendered as background behind img)
  const fallbackLayer = (
    <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-between p-3`}>
      <div className="w-full border-b border-white/20 pb-1 mb-1">
        <span className="text-[10px] text-white/60 font-light tracking-wider uppercase">{category || 'BOOK'}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-white font-bold text-center leading-snug line-clamp-4">
          {cleanTitle}
        </span>
      </div>
      <div className="w-full border-t border-white/20 pt-1">
        <span className="text-[10px] text-white/70 font-medium text-center block truncate">
          {author}
        </span>
      </div>
    </div>
  );

  // Image with fallback underneath
  if (showImg) {
    return (
      <div className="w-[130px] h-[180px] flex-shrink-0 rounded-lg overflow-hidden shadow-md relative">
        {fallbackLayer}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          alt={title}
          className="w-full h-full object-cover relative z-10"
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (isBlankImage(img)) setImgError(true);
          }}
        />
      </div>
    );
  }
  return (
    <div className={`w-[130px] h-[180px] flex-shrink-0 rounded-lg overflow-hidden shadow-md bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-between p-3`}>
      {loading ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="w-full border-b border-white/20 pb-1 mb-1">
            <span className="text-[10px] text-white/60 font-light tracking-wider uppercase">{category || 'BOOK'}</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-white font-bold text-center leading-snug line-clamp-4">
              {cleanTitle}
            </span>
          </div>
          <div className="w-full border-t border-white/20 pt-1">
            <span className="text-[10px] text-white/70 font-medium text-center block truncate">
              {author}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
