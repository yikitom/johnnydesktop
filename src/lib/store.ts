import { create } from 'zustand';

// ==================== Auth Store ====================
interface AuthState {
  isAuthenticated: boolean;
  user: { name: string; email: string; avatar?: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: async (email: string, password: string) => {
    // Demo: accept any non-empty credentials
    if (email && password) {
      set({
        isAuthenticated: true,
        user: { name: email.split('@')[0], email, avatar: undefined },
      });
      return true;
    }
    return false;
  },
  logout: () => set({ isAuthenticated: false, user: null }),
}));

// ==================== Book Types ====================
export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  summary: string;
  content: string;
  oneSentenceSummary: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  airtableId?: string;
  status: 'pending' | 'generating' | 'ready' | 'error';
}

interface BookState {
  books: Book[];
  searchQuery: string;
  categoryFilter: string;
  showRecycleBin: boolean;
  setBooks: (books: Book[]) => void;
  addBook: (book: Book) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  restoreBook: (id: string) => void;
  permanentDeleteBook: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: string) => void;
  setShowRecycleBin: (v: boolean) => void;
}

export const useBookStore = create<BookState>((set) => ({
  books: [],
  searchQuery: '',
  categoryFilter: '',
  showRecycleBin: false,
  setBooks: (books) => set({ books }),
  addBook: (book) => set((s) => ({ books: [book, ...s.books] })),
  updateBook: (id, updates) =>
    set((s) => ({
      books: s.books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  deleteBook: (id) =>
    set((s) => ({
      books: s.books.map((b) =>
        b.id === id ? { ...b, isDeleted: true } : b
      ),
    })),
  restoreBook: (id) =>
    set((s) => ({
      books: s.books.map((b) =>
        b.id === id ? { ...b, isDeleted: false } : b
      ),
    })),
  permanentDeleteBook: (id) =>
    set((s) => ({ books: s.books.filter((b) => b.id !== id) })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setShowRecycleBin: (showRecycleBin) => set({ showRecycleBin }),
}));

// ==================== DataLab Types ====================
export interface DataSource {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  enabled: boolean;
}

export interface DataApplication {
  id: string;
  name: string;
  description: string;
  icon: string;
  sourceIds: string[];
  status: 'idle' | 'generating' | 'ready';
  result?: string;
}

interface DataLabState {
  sources: DataSource[];
  applications: DataApplication[];
  selectedSourceIds: string[];
  chatMessages: { role: 'user' | 'assistant'; content: string }[];
  toggleSource: (id: string) => void;
  setSelectedSourceIds: (ids: string[]) => void;
  addChatMessage: (msg: { role: 'user' | 'assistant'; content: string }) => void;
  clearChat: () => void;
  updateApplication: (id: string, updates: Partial<DataApplication>) => void;
}

const defaultSources: DataSource[] = [
  { id: 'xiaohongshu', name: '小红书', type: 'social', icon: '📕', description: '小红书平台用户笔记与评论数据', enabled: true },
  { id: 'tourism', name: '各地旅游局数据', type: 'government', icon: '🏛️', description: '全国各地旅游局公开统计数据', enabled: true },
  { id: 'consultation', name: '用户咨询数据', type: 'internal', icon: '💬', description: '客服系统中的用户咨询记录', enabled: true },
  { id: 'search', name: '用户查询数据', type: 'internal', icon: '🔍', description: '站内搜索和查询行为数据', enabled: true },
  { id: 'visit', name: '用户访问数据', type: 'internal', icon: '📊', description: '用户浏览和访问行为数据', enabled: true },
];

const defaultApplications: DataApplication[] = [
  { id: 'spu', name: '用户需求SPU', description: '基于多维数据生成用户需求标准化产品单元', icon: '🎯', sourceIds: [], status: 'idle' },
  { id: 'entry-report', name: '目的地入境数据报告', description: '整合入境游客数据生成目的地分析报告', icon: '✈️', sourceIds: [], status: 'idle' },
  { id: 'complaint-report', name: '媒体客诉报告', description: '汇总分析媒体渠道客户投诉生成报告', icon: '📋', sourceIds: [], status: 'idle' },
];

export const useDataLabStore = create<DataLabState>((set) => ({
  sources: defaultSources,
  applications: defaultApplications,
  selectedSourceIds: [],
  chatMessages: [],
  toggleSource: (id) =>
    set((s) => ({
      selectedSourceIds: s.selectedSourceIds.includes(id)
        ? s.selectedSourceIds.filter((sid) => sid !== id)
        : [...s.selectedSourceIds, id],
    })),
  setSelectedSourceIds: (ids) => set({ selectedSourceIds: ids }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),
  updateApplication: (id, updates) =>
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),
}));
