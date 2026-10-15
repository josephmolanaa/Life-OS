'use client';

import { useEffect, useRef, type ComponentProps } from 'react';

export function LocalDateInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (input && !input.value) {
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      input.value = today.toISOString().slice(0, 10);
    }
  }, []);

  return <input {...props} type="date" ref={ref} />;
}
