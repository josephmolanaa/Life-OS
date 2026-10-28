'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/finance/layout';
import { DailyQuestCard } from '@/components/life-os-daily-quest';
import { ContentSkeleton } from '@/components/app-loading';
import { useDailyQuests } from '@/components/use-daily-quests';
import { getLang, type Lang } from '@/lib/i18n';

export default function HabitsPage() {
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => { getLang().then(setLang); }, []);
  const quests = useDailyQuests(lang);
  return <Shell title={lang === 'id' ? 'Kebiasaan' : 'Habits'} quickFab={false}>
    <div className="lifeDashboard">
      <header>
        <h2 style={{ margin: '0 0 8px' }}>{lang === 'id' ? 'Checklist harian' : 'Daily checklist'}</h2>
        <p className="muted">{lang === 'id' ? 'Checklist yang sama dengan dashboard. Centang setelah selesai hari ini.' : 'The same checklist as your dashboard. Check off habits completed today.'}</p>
      </header>
      {quests.loading ? <ContentSkeleton variant="habits" /> : <DailyQuestCard {...quests} lang={lang} />}
    </div>
  </Shell>;
}
