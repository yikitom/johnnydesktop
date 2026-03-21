'use client';

import { useState, useRef, useEffect } from 'react';
import { useDataLabStore } from '@/lib/store';
import { chatWithData, processDataLab } from '@/lib/ai';
import toast from 'react-hot-toast';

export default function DataLabPage() {
  const {
    sources, applications, selectedSourceIds, chatMessages,
    toggleSource, addChatMessage, clearChat, updateApplication,
  } = useDataLabStore();

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingApp, setGeneratingApp] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChat = async () => {
    if (!chatInput.trim() || selectedSourceIds.length === 0) {
      if (selectedSourceIds.length === 0) {
        toast.error('请先选择至少一个数据源');
      }
      return;
    }

    const msg = chatInput.trim();
    setChatInput('');
    addChatMessage({ role: 'user', content: msg });
    setChatLoading(true);

    try {
      const reply = await chatWithData(selectedSourceIds, msg, chatMessages);
      addChatMessage({ role: 'assistant', content: reply });
    } catch {
      addChatMessage({ role: 'assistant', content: '抱歉，处理过程中出现错误，请重试。' });
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateReport = async (appId: string) => {
    if (selectedSourceIds.length === 0) {
      toast.error('请先选择数据源');
      return;
    }

    setGeneratingApp(appId);
    updateApplication(appId, { status: 'generating', sourceIds: selectedSourceIds });

    try {
      const result = await processDataLab(selectedSourceIds, appId);
      updateApplication(appId, { status: 'ready', result });
      setActiveReport(appId);
      toast.success('报告生成完成！');
    } catch {
      updateApplication(appId, { status: 'idle' });
      toast.error('生成失败');
    } finally {
      setGeneratingApp(null);
    }
  };

  const activeApp = applications.find((a) => a.id === activeReport);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-gray-900">数据实验室</h1>
        <p className="text-sm text-gray-500 mt-1">数据来源 → 数据加工 → 数据应用</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Data Sources */}
        <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              数据来源
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              已选 {selectedSourceIds.length}/{sources.length}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sources.map((source) => {
              const isSelected = selectedSourceIds.includes(source.id);
              return (
                <button
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                      : 'bg-gray-50 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{source.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                        {source.name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{source.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Data Applications */}
          <div className="border-t border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                数据应用
              </h2>
            </div>
            <div className="p-3 space-y-2">
              {applications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    if (app.status === 'ready') {
                      setActiveReport(app.id);
                    } else {
                      handleGenerateReport(app.id);
                    }
                  }}
                  disabled={generatingApp === app.id}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    activeReport === app.id
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-gray-50 border-transparent hover:bg-gray-100'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{app.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{app.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{app.description}</p>
                    </div>
                    {generatingApp === app.id ? (
                      <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : app.status === 'ready' ? (
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Panel - Data Processing (Chat) */}
        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              数据加工
              {selectedSourceIds.length > 0 && (
                <span className="text-[11px] text-gray-400 font-normal">
                  · 已连接 {selectedSourceIds.length} 个数据源
                </span>
              )}
            </h2>
            {chatMessages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-[11px] text-gray-400 hover:text-gray-600 mt-1"
              >
                清空对话
              </button>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-500 text-sm">选择数据源后，通过对话进行数据聚焦和加工</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['分析用户需求趋势', '对比各渠道数据', '生成数据摘要'].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setChatInput(q);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-md'
                      : 'bg-white text-gray-700 border border-gray-100 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                placeholder={
                  selectedSourceIds.length === 0
                    ? '请先选择数据源...'
                    : '输入问题，对数据进行聚焦分析...'
                }
                disabled={selectedSourceIds.length === 0}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
              <button
                onClick={handleChat}
                disabled={!chatInput.trim() || selectedSourceIds.length === 0 || chatLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                发送
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Report Preview */}
        {activeApp?.result && (
          <div className="w-[420px] border-l border-gray-200 bg-white flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                {activeApp.icon} {activeApp.name}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateReport(activeApp.id)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800"
                >
                  🔄 重新生成
                </button>
                <button
                  onClick={() => setActiveReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {activeApp.result}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
