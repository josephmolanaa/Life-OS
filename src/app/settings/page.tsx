import Link from 'next/link';
import { ChevronDown, Sun, UserRound, WalletCards } from 'lucide-react';
import { ChromeControls } from '@/components/finance/chrome-controls';
import { Shell } from '@/components/finance/layout';
import { AiProviderSettings } from '@/components/ai-settings';
import { AppInfoSettings } from '@/components/app-info-settings';
import { DuckiesSettings } from '@/components/duckies-settings';
import { getLang } from '@/lib/i18n';

export default async function SettingsPage() {
  const id = (await getLang()) === 'id';

  return <Shell title={id ? 'Pengaturan' : 'Settings'} quickFab={false}>
    <div className="generalSettings">
      <header className="settingsPageHeader">
        <p className="muted">{id ? 'PREFERENSI APLIKASI' : 'APP PREFERENCES'}</p>
        <h2>{id ? 'Atur Life OS sesuai kebutuhanmu.' : 'Make Life OS feel like yours.'}</h2>
      </header>
      <details className="card generalSettingsCard collapsibleCard" open>
        <summary className="settingsSectionHeader">
          <div><span className="pill">{id ? 'Umum' : 'General'}</span><h2>{id ? 'Tampilan & bahasa' : 'Appearance & language'}</h2><p className="muted noMargin">{id ? 'Pilihan ini berlaku di seluruh aplikasi.' : 'These preferences apply across the whole app.'}</p></div>
          <span className="collapseToggle"><ChevronDown size={18} className="collapseChevron" aria-hidden="true" /></span>
        </summary>
        <div className="generalSettingsOptions">
          <div className="generalSettingRow"><span className="generalSettingIcon"><Sun size={18} aria-hidden="true" /></span><div><b>{id ? 'Tema & bahasa' : 'Theme & language'}</b><p className="muted noMargin">{id ? 'Ubah tampilan dan bahasa aplikasi.' : 'Change the app appearance and language.'}</p></div><ChromeControls expanded /></div>
        </div>
      </details>
      <details className="card generalSettingsLinks collapsibleCard" open>
        <summary className="settingsSectionHeader">
          <div><span className="pill">{id ? 'Akun & modul' : 'Account & modules'}</span><h2>{id ? 'Pengaturan lainnya' : 'More settings'}</h2></div>
          <span className="collapseToggle"><ChevronDown size={18} className="collapseChevron" aria-hidden="true" /></span>
        </summary>
        <Link className="settingsLink" href="/account"><UserRound size={19} aria-hidden="true" /><span>{id ? 'Akun' : 'Account'}</span></Link>
        <Link className="settingsLink" href="/finance/settings"><WalletCards size={19} aria-hidden="true" /><span>{id ? 'Pengaturan keuangan' : 'Finance settings'}</span></Link>
      </details>
      <DuckiesSettings lang={id ? 'id' : 'en'} />
      <AppInfoSettings lang={id ? 'id' : 'en'} />
      <AiProviderSettings lang={id ? 'id' : 'en'} />
    </div>
  </Shell>;
}
