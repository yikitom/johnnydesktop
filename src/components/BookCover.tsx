'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Category → gradient mapping for default covers
const CATEGORY_STYLES: Record<string, { gradient: string }> = {
  '文学小说': { gradient: 'from-rose-400 to-pink-600' },
  '商业管理': { gradient: 'from-blue-400 to-indigo-600' },
  '科技创新': { gradient: 'from-cyan-400 to-blue-600' },
  '心理学': { gradient: 'from-purple-400 to-violet-600' },
  '历史人文': { gradient: 'from-amber-400 to-orange-600' },
  '哲学思想': { gradient: 'from-indigo-400 to-purple-600' },
  '自我成长': { gradient: 'from-emerald-400 to-teal-600' },
  '社会科学': { gradient: 'from-teal-400 to-cyan-600' },
  '艺术设计': { gradient: 'from-pink-400 to-rose-600' },
  '科普读物': { gradient: 'from-green-400 to-emerald-600' },
};

const DEFAULT_STYLE = { gradient: 'from-indigo-400 to-purple-600' };

const LOADING_TIMEOUT_MS = 15_000;

interface BookCoverProps {
  title: string;
  author: string;
  category: string;
  coverUrl?: string;
  onCoverLoaded?: (url: string) => void;
}

function FallbackCover({ title, author, category, gradient, loading }: {
  title: string; author: string; category: string; gradient: string; loading?: boolean;
}) {
  const cleanTitle = title.replace(/[《》]/g, '');
  return (
    <div className={`w-[130px] h-[180px] flex-shrink-0 rounded-lg overflow-hidden shadow-md bg-gradient-to-br ${gradient} flex flex-col items-center justify-between p-3`}>
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

export default function BookCover({ title, author, category, coverUrl, onCoverLoaded }: BookCoverProps) {
  const [imgUrl, setImgUrl] = useState(coverUrl || '');
  const [imgError, setImgError] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [fetching, setFetching] = useState(!coverUrl);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCoverLoadedRef = useRef(onCoverLoaded);
  onCoverLoadedRef.current = onCoverLoaded;

  const style = CATEGORY_STYLES[category] || DEFAULT_STYLE;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleImgLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setImgReady(true);
    setFetching(false);
  }, []);

  const handleImgError = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setImgError(true);
    setImgReady(false);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (coverUrl) {
      setImgUrl(coverUrl);
      setImgError(false);
      setImgReady(false);
      setFetching(false);

      timeoutRef.current = setTimeout(() => {
        setImgError(true);
        setImgReady(false);
      }, LOADING_TIMEOUT_MS);
      return;
    }

    // Fetch cover from API
    let cancelled = false;
    setFetching(true);

    const apiTimeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        setFetching(false);
      }
    }, LOADING_TIMEOUT_MS);

    fetch(`/api/book-cover?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`)
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(apiTimeout);
        if (cancelled) return;
        if (data.coverUrl) {
          setImgUrl(data.coverUrl);
          setImgError(false);
          setImgReady(false);
          setFetching(false);
          onCoverLoadedRef.current?.(data.coverUrl);

          timeoutRef.current = setTimeout(() => {
            if (!cancelled) {
              setImgError(true);
              setImgReady(false);
            }
          }, LOADING_TIMEOUT_MS);
        } else {
          setFetching(false);
        }
      })
      .catch(() => {
        clearTimeout(apiTimeout);
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(apiTimeout);
    };
  }, [title, author, coverUrl]);

  // Still fetching from API — show gradient + spinner
  if (fetching) {
    return <FallbackCover title={title} author={author} category={category} gradient={style.gradient} loading />;
  }

  // No image URL or image failed to load → show gradient fallback with title
  if (!imgUrl || imgError) {
    return <FallbackCover title={title} author={author} category={category} gradient={style.gradient} />;
  }

  // Image URL exists — render img with gradient background underneath
  return (
    <div className={`w-[130px] h-[180px] flex-shrink-0 rounded-lg overflow-hidden shadow-md bg-gradient-to-br ${style.gradient} relative`}>
      {!imgReady && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl}
        alt={title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${imgReady ? 'opacity-100' : 'opacity-0'}`}
        onLoad={handleImgLoad}
        onError={handleImgError}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
