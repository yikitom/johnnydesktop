'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useBookStore } from '@/lib/store';
import { generateBookContent } from '@/lib/ai';
import { updateBookInAirtable } from '@/lib/airtable';
import toast from 'react-hot-toast';
import { useState } from 'react';
import ShareModal from '@/components/ShareModal';

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { books, updateBook } = useBookStore();
  const [shareOpen, setShareOpen] = useState(false);
  const book = books.find((b) => b.id === id);

  if (!book) {
    return (
      <div className="p-8 text-center py-20">
        <div className="text-5xl mb-4">📖</div>
        <p className="text-gray-500 mb-4">未找到该书籍</p>
        <button
          onClick={() => router.push('/reading')}
          className="px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-600 hover:bg-gray-200"
        >
          返回书架
        </button>
      </div>
    );
  }

  const handleRegenerate = async () => {
    updateBook(book.id, { status: 'generating' });
    try {
      const result = await generateBookContent(book.title, book.author);
      const updatedFields = {
        ...result,
        status: 'ready' as const,
        updatedAt: new Date().toISOString(),
      };
      updateBook(book.id, updatedFields);

      if (book.airtableId) {
        await updateBookInAirtable(book.airtableId, updatedFields);
      }

      toast.success('内容已更新！');
    } catch (err) {
      updateBook(book.id, { status: 'error' });
      const msg = err instanceof Error ? err.message : '更新失败';
      toast.error(msg);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/reading')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
          <p className="text-sm text-gray-500">
            {book.author} · {book.category} · {new Date(book.updatedAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors"
          >
            🔗 分享
          </button>
          <button
            onClick={handleRegenerate}
            disabled={book.status === 'generating'}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {book.status === 'generating' ? '生成中...' : '🔄 重新生成'}
          </button>
        </div>
      </div>

      {/* One Sentence Summary */}
      {book.oneSentenceSummary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 mb-6">
          <p className="text-indigo-900 font-medium italic">
            &ldquo;{book.oneSentenceSummary}&rdquo;
          </p>
        </div>
      )}

      {/* Summary */}
      {book.summary && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-indigo-500 rounded-full inline-block" />
            核心摘要
          </h2>
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {book.summary}
          </div>
        </div>
      )}

      {/* Full Content */}
      {book.content && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-purple-500 rounded-full inline-block" />
            深度解读
          </h2>
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {book.content}
          </div>
        </div>
      )}

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        book={book}
      />
    </div>
  );
}
