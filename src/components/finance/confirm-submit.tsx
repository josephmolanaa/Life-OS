'use client';

import type { ReactNode } from 'react';

export function ConfirmSubmit({ children, message, className = 'btn danger', ariaLabel }: { children: ReactNode; message: string; className?: string; ariaLabel?: string }) {
  return <button className={className} type="submit" aria-label={ariaLabel} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
