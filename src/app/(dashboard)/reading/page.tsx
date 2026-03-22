'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useBookStore, type Book } from '@/lib/store';
import { generateBookContent, type GenerationProgress } from '@/lib/ai';
import { saveBookToAirtable, fetchBooksFromAirtable, updateBookInAirtable } from '@/lib/airtable';
import CreateBookModal from '@/components/CreateBookModal';
import ShareModal from '@/components/ShareModal';
import toast from 'react-hot-toast';

export default function ReadingPage() {
  const {
    books, searchQuery, categoryFilter, showRecycleBin,
    addBook, updateBook, deleteBook, restoreBook, permanentDeleteBook,
    setSearchQuery, setCategoryFilter, setShowRecycleBin,
  } = useBookStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shareBook, setShareBook] = useState<Book | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Track generation progress: { [bookId]: progressMessage }
  const [progressMap, setProgressMap] = useState<Record<string, string>>({});

  // Load books from Airtable on mount
  useEffect(() => {
    if (loaded) return;
    fetchBooksFromAirtable().then((airtableBooks) => {
      if (airtableBooks.length > 0) {
        const existingIds = new Set(books.map((b) => b.airtableId).filter(Boolean));
        for (const ab of airtableBooks) {
          if (!existingIds.has(ab.airtableId)) {
            addBook(ab);
          }
        }
      }
      setLoaded(true);
    });
  }, [loaded, books, addBook]);

  const handleOpenBook = useCallback((book: Book) => {
    if (book.airtableId) {
      window.open(`/reading/view/${book.airtableId}`, '_blank');
    } else {
      toast.error('书籍尚未保存到数据库，请先点击更新');
    }
  }, []);

  // Get all categories
  const categories = useMemo(() => {
    const cats = new Set(books.filter((b) => !b.isDeleted).map((b) => b.category));
    return Array.from(cats);
  }, [books]);

  // Filter books
  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => b.isDeleted === showRecycleBin)
      .filter((b) => !categoryFilter || b.category === categoryFilter)
      .filter((b) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [books, searchQuery, categoryFilter, showRecycleBin]);

  const onProgress = useCallback((bookId: string, progress: GenerationProgress) => {
    setProgressMap((prev) => ({ ...prev, [bookId]: progress.message }));
  }, []);

  const handleCreateBook = async (title: string, author: string) => {
    const id = `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const newBook: Book = {
      id,
      title,
      author,
      category: '',
      summary: '',
      content: '',
      oneSentenceSummary: '',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      status: 'generating',
    };

    addBook(newBook);
    setCreating(true);
    setModalOpen(false);

    try {
      const result = await generateBookContent(title, author, (p) => onProgress(id, p));
      const updatedFields: Partial<Book> = {
        ...result,
        status: 'ready' as const,
        updatedAt: new Date().toISOString(),
      };

      // Save to Airtable FIRST
      const airtableId = await saveBookToAirtable({ ...newBook, ...updatedFields });

      // Update local store with content AND airtableId together
      updateBook(id, { ...updatedFields, ...(airtableId ? { airtableId } : {}) });

      toast.success('深度解读生成完成！');
    } catch (err) {
      updateBook(id, { status: 'error' });
      const msg = err instanceof Error ? err.message : '生成失败';
      toast.error(msg);
    } finally {
      setCreating(false);
      setProgressMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleRegenerate = async (book: Book) => {
    updateBook(book.id, { status: 'generating' });
    try {
      const result = await generateBookContent(book.title, book.author, (p) => onProgress(book.id, p));
      const updatedFields: Partial<Book> = {
        ...result,
        status: 'ready' as const,
        updatedAt: new Date().toISOString(),
      };
      updateBook(book.id, updatedFields);

      if (book.airtableId) {
        await updateBookInAirtable(book.airtableId, updatedFields);
      } else {
        const airtableId = await saveBookToAirtable({ ...book, ...updatedFields });
        if (airtableId) {
          updateBook(book.id, { airtableId });
        }
      }

      toast.success('深度解读重新生成完成！');
    } catch (err) {
      updateBook(book.id, { status: 'error' });
      const msg = err instanceof Error ? err.message : '重新生成失败';
      toast.error(msg);
    } finally {
      setProgressMap((prev) => {
        const next = { ...prev };
        delete next[book.id];
        return next;
      });
    }
  };

  const handleDelete = async (book: Book) => {
    deleteBook(book.id);
    if (book.airtableId) {
      try {
        await updateBookInAirtable(book.airtableId, { isDeleted: true });
      } catch (e) {
        console.error('Failed to sync delete to Airtable:', e);
      }
    }
  };

  const handleRestore = async (book: Book) => {
    restoreBook(book.id);
    if (book.airtableId) {
      try {
        await updateBookInAirtable(book.airtableId, { isDeleted: false });
      } catch (e) {
        console.error('Failed to sync restore to Airtable:', e);
      }
    }
  };

  const recycleBinCount = books.filter((b) => b.isDeleted).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showRecycleBin ? '回收站' : 'AI 读书'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {showRecycleBin
              ? `${recycleBinCount} 本书籍在回收站中`
              : `共 ${filteredBooks.length} 本书籍`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowRecycleBin(!showRecycleBin);
              setCategoryFilter('');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              showRecycleBin
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🗑️ 回收站{recycleBinCount > 0 && ` (${recycleBinCount})`}
          </button>
          {!showRecycleBin && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              + 创建 AI 读书
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      {!showRecycleBin && (
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索书名、作者..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                !categoryFilter
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  categoryFilter === cat
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">{showRecycleBin ? '🗑️' : '📚'}</div>
          <p className="text-gray-500">
            {showRecycleBin ? '回收站是空的' : '还没有书籍，点击「创建 AI 读书」开始'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all group overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {book.status === 'ready' ? (
                      <h3
                        onClick={() => handleOpenBook(book)}
                        className="font-semibold text-gray-900 truncate hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        {book.title}
                      </h3>
                    ) : (
                      <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                    )}
                    <p className="text-sm text-gray-500 mt-0.5">{book.author}</p>
                  </div>
                  {book.category && (
                    <span className="ml-2 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[11px] font-medium whitespace-nowrap">
                      {book.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="px-5 py-4">
                {book.status === 'generating' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-indigo-500">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>{progressMap[book.id] || 'AI 正在生成深度解读...'}</span>
                    </div>
                    {progressMap[book.id] && (
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: progressMap[book.id]?.includes('上篇') ? '45%'
                              : progressMap[book.id]?.includes('下篇') ? '75%'
                              : '15%',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : book.status === 'error' ? (
                  <p className="text-sm text-red-500">生成失败</p>
                ) : (
                  <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                    {book.oneSentenceSummary}
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  {new Date(book.updatedAt).toLocaleDateString('zh-CN')}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {showRecycleBin ? (
                    <>
                      <button
                        onClick={() => handleRestore(book)}
                        className="px-2.5 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        恢复
                      </button>
                      <button
                        onClick={() => permanentDeleteBook(book.id)}
                        className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        彻底删除
                      </button>
                    </>
                  ) : (
                    <>
                      {(book.status === 'ready' || book.status === 'error') && (
                        <>
                          <button
                            onClick={() => handleRegenerate(book)}
                            className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="重新生成"
                          >
                            🔄 更新
                          </button>
                          {book.status === 'ready' && (
                            <button
                              onClick={() => setShareBook(book)}
                              className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                              title="分享"
                            >
                              🔗 分享
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(book)}
                        className="px-2.5 py-1 text-xs text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="移入回收站"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateBookModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateBook}
        isLoading={creating}
      />

      <ShareModal
        isOpen={!!shareBook}
        onClose={() => setShareBook(null)}
        book={shareBook}
      />
    </div>
  );
}
