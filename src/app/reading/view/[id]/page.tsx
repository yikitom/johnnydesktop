'use client';

import { use, useEffect, useState } from 'react';

interface BookData {
  title: string;
  author: string;
  htmlContent: string;
}

export default function BookViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBook() {
      try {
        const res = await fetch(`/api/airtable?id=${id}`);
        const data = await res.json();
        if (data.book) {
          setBook(data.book);
        } else {
          setError('未找到该书籍');
        }
      } catch {
        setError('加载失败，请重试');
      } finally {
        setLoading(false);
      }
    }
    loadBook();
  }, [id]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📚</div>
          <p>正在加载书籍内容...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f5f5fa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>{error || '未找到该书籍'}</p>
        </div>
      </div>
    );
  }

  // If we have htmlContent, render it directly as a full page
  if (book.htmlContent) {
    return (
      <iframe
        srcDoc={book.htmlContent}
        style={{
          width: '100%',
          height: '100vh',
          border: 'none',
        }}
        title={book.title}
        sandbox="allow-same-origin"
      />
    );
  }

  // Fallback: no HTML content available
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f5f5fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
        <h1 style={{ fontSize: '1.5rem', color: '#1a1a2e', marginBottom: '0.5rem' }}>{book.title}</h1>
        {book.author && <p style={{ color: '#6b7280' }}>{book.author}</p>}
        <p style={{ color: '#9ca3af', marginTop: '1rem' }}>暂无 HTML 报告内容</p>
      </div>
    </div>
  );
}
