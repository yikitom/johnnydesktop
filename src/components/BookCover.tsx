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
  /** Called when user clicks a cover that already has an image */
  onClickImage?: () => void;
}

function FallbackCover({ title, author, category, gradient, loading, onClick }: {
  title: string; author: string; category: string; gradient: string; loading?: boolean; onClick?: () => void;
}) {
  const cleanTitle = title.replace(/[《》]/g, '');
  return (
    <div
      className={`w-[130px] h-[180px] flex-shrink-0 rounded-lg overflow-hidden shadow-md bg-gradient-to-br ${gradient} flex flex-col items-center justify-between p-3 ${onClick ? 'cursor-pointer hover:shadow-lg hover:brightness-110 transition-all group/cover' : ''}`}
      onClick={onClick}
      title={onClick ? '点击搜索封面图片' : undefined}
    >
      {loading ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="w-full border-b border-white/20 pb-1 mb-1 flex items-center justify-between">
            <span className="text-[10px] text-white/60 font-light tracking-wider uppercase">{category || 'BOOK'}</span>
            {onClick && (
              <svg className="w-3 h-3 text-white/40 group-hover/cover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
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

export default function BookCover({ title, author, category, coverUrl, onCoverLoaded, onClickImage }: BookCoverProps) {
  const [imgUrl, setImgUrl] = useState(coverUrl || '');
  const [imgError, setImgError] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [fetching, setFetching] = useState(!coverUrl);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCoverLoadedRef = useRef(onCoverLoaded);
  onCoverLoadedRef.current = onCoverLoaded;
  // Track whether the current URL was freshly fetched (needs persisting after verification)
  const pendingSaveUrlRef = useRef<string | null>(null);

  const style = CATEGORY_STYLES[category] || DEFAULT_STYLE;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Shared fetch logic used by both initial mount and manual retry
  const fetchCover = useCallback(() => {
    setFetching(true);
    setImgUrl('');
    setImgError(false);
    setImgReady(false);
    pendingSaveUrlRef.current = null;

    const controller = new AbortController();

    const apiTimeout = setTimeout(() => {
      controller.abort();
      setFetching(false);
    }, LOADING_TIMEOUT_MS);

    fetch(`/api/book-cover?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(apiTimeout);
        if (controller.signal.aborted) return;
        if (data.coverUrl) {
          setImgUrl(data.coverUrl);
          setImgError(false);
          setImgReady(false);
          setFetching(false);
          // Don't call onCoverLoaded yet — wait for img onLoad to verify
          pendingSaveUrlRef.current = data.coverUrl;

          timeoutRef.current = setTimeout(() => {
            if (!controller.signal.aborted) {
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
        if (!controller.signal.aborted) setFetching(false);
      });

    return controller;
  }, [title, author]);

  const handleImgLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setImgReady(true);
    setFetching(false);
    // Image loaded successfully — if this was a freshly fetched URL, persist it now
    if (pendingSaveUrlRef.current) {
      onCoverLoadedRef.current?.(pendingSaveUrlRef.current);
      pendingSaveUrlRef.current = null;
    }
  }, []);

  const handleImgError = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setImgError(true);
    setImgReady(false);
    setFetching(false);
  }, []);

  // Initial load: use coverUrl if provided, otherwise fetch
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

    const controller = fetchCover();
    return () => controller.abort();
  }, [title, author, coverUrl, fetchCover]);

  // Manual retry: click fallback to re-search
  const handleRetrySearch = useCallback(() => {
    if (fetching) return;
    fetchCover();
  }, [fetching, fetchCover]);

  // Still fetching from API — show gradient + spinner
  if (fetching) {
    return <FallbackCover title={title} author={author} category={category} gradient={style.gradient} loading />;
  }

  // No image URL or image failed to load → show gradient fallback, clickable to retry search
  if (!imgUrl || imgError) {
    return <FallbackCover title={title} author={author} category={category} gradient={style.gradient} onClick={handleRetrySearch} />;
  }

  // Image URL exists — render img, clickable to open book detail
  return (
    <div
      className={`w-[130px] h-[180px] flex-shrink-0 rounded-lg overflow-hidden shadow-md bg-gradient-to-br ${style.gradient} relative ${onClickImage ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={imgReady ? onClickImage : undefined}
      title={imgReady && onClickImage ? '点击查看详情' : undefined}
    >
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
