'use client';

import { use } from 'react';

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-8 text-white shadow-2xl">
          <span className="inline-block bg-white/15 px-3 py-1 rounded-full text-xs mb-5">
            📚 AI读书推荐
          </span>

          <div className="text-center py-8">
            <div className="text-4xl mb-4">📖</div>
            <p className="text-white/60 text-sm">
              书籍分享页面
            </p>
            <p className="text-white/40 text-xs mt-2">ID: {id}</p>
          </div>

          <div className="h-px bg-white/20 my-4" />

          <p className="text-sm text-white/50 text-center">
            登录 AI 工作台查看完整内容
          </p>

          <a
            href="/login"
            className="mt-4 block w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-center text-sm font-medium hover:shadow-lg transition-all"
          >
            前往登录
          </a>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Powered by AI 工作台
        </p>
      </div>
    </div>
  );
}
