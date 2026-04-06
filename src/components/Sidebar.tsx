'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const navItems = [
  { href: '/reading', label: 'AI Reading', icon: '📚' },
  { href: '/datalab', label: 'AI Data Lab', icon: '🔬' },
  { href: '/improve', label: 'AI Learning Plan', icon: '🚀' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0f0f1a] text-white flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-lg font-bold">
            AI
          </div>
          <div>
            <h1 className="text-base font-semibold">AI 工作台</h1>
            <p className="text-[11px] text-white/40">Intelligent Workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/30 font-medium">
          工作空间
        </div>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || ''}
              className="w-8 h-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-white/40 hover:text-white/80 text-xs transition-colors"
            title="退出登录"
          >
            退出
          </button>
        </div>
      </div>
    </aside>
  );
}
