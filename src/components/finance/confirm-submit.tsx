'use client';

import type { ReactNode } from 'react';

export function ConfirmSubmit({ children, message, className = 'btn danger' }: { children: ReactNode; message: string; className?: string }) {
  return <button className={className} type="submit" onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
