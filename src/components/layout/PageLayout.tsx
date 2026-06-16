import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface Props {
  title?: string;
  backTo?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageLayout({ title, backTo, children, actions }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {(title || backTo) && (
        <header className="safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur">
          {backTo && (
            <button
              onClick={() => navigate(backTo)}
              className="btn btn-secondary btn-sm"
              aria-label="Back"
            >
              ← Back
            </button>
          )}
          {title && <h1 className="flex-1 text-lg font-bold text-white">{title}</h1>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
