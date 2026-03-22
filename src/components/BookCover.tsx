'use client';

import { useState, useEffect } from 'react';

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

  // Show real cover image
  if (imgUrl && !imgError) {
    return (
      <div className="w-[130px] h-[180px] flex-shrink-0 rounded-lg overflow-hidden shadow-md bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Default cover with category gradient
  return (
    <div className={`w-[130px] h-[180px] flex-shrink-0 rounded-lg overflow-hidden shadow-md bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center p-2`}>
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <span className="text-4xl mb-2">{style.emoji}</span>
          <span className="text-xs text-white/90 font-medium text-center leading-tight line-clamp-2">
            {title.replace(/[《》]/g, '')}
          </span>
        </>
      )}
    </div>
  );
}
