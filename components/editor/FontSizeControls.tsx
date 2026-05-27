'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef } from 'react';

import { useSettings } from '@/components/providers/SettingsProvider';
import { fontSizePx } from '@/lib/data/default-settings';

const levels = ['S', 'M', 'L', 'XL', 'XXL'] as const;

export function FontSizeControls() {
  const { data: session } = useSession();
  const { settings, patchSettings } = useSettings();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const index = levels.indexOf(settings.viewFontSize);

  const saveRemote = useMemo(
    () => (nextLevel: (typeof levels)[number]) => {
      if (!session?.user.id) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        await fetch(`/api/users/${session.user.id}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...settings, viewFontSize: nextLevel }),
        });
      }, 500);
    },
    [session?.user.id, settings],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const update = (offset: number) => {
    const next = levels[index + offset];
    if (!next) {
      return;
    }
    patchSettings({ viewFontSize: next });
    saveRemote(next);
    document.documentElement.style.setProperty('--vd-font-size', `${fontSizePx[next]}px`);
  };

  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      <button type="button" onClick={() => update(-1)}>
        −
      </button>
      <button type="button" disabled>
        {settings.viewFontSize}
      </button>
      <button type="button" onClick={() => update(1)}>
        +
      </button>
    </div>
  );
}
