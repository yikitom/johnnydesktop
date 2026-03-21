'use client';

import { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  book: {
    title: string;
    author: string;
    oneSentenceSummary: string;
    id: string;
  } | null;
}

export default function ShareModal({ isOpen, onClose, book }: Props) {
  const [cardHtml, setCardHtml] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && book) {
      setLoading(true);
      const shareUrl = `${window.location.origin}/share/${book.id}`;
      fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          oneSentenceSummary: book.oneSentenceSummary,
          shareUrl,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          setCardHtml(data.cardHtml || '');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const copyLink = () => {
    const url = `${window.location.origin}/share/${book.id}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">分享书籍</h2>
            <p className="text-sm text-white/70">生成分享卡片</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Preview card */}
              <div className="rounded-xl overflow-hidden shadow-lg mb-4">
                <div
                  className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-8 text-white"
                >
                  <span className="inline-block bg-white/15 px-3 py-1 rounded-full text-xs mb-4">
                    📚 AI读书推荐
                  </span>
                  <h3 className="text-xl font-bold mb-1">{book.title}</h3>
                  <p className="text-sm text-white/60 mb-4">✍️ {book.author}</p>
                  <div className="h-px bg-white/20 mb-4" />
                  <p className="text-sm text-white/80 italic leading-relaxed">
                    &ldquo;{book.oneSentenceSummary}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyLink}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  复制链接
                </button>
                <button
                  onClick={() => {
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(cardHtml);
                      win.document.close();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
                >
                  查看完整卡片
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
