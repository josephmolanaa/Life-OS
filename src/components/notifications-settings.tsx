'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useClientReady } from '@/lib/use-client-ready';

export function NotificationsSettings({ lang }: { lang: 'en' | 'id' }) {
  const ready = useClientReady();
  return ready ? <NotificationPreferences lang={lang} /> : null;
}

function NotificationPreferences({ lang }: { lang: 'en' | 'id' }) {
  const [settings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeos-notifications') || '{}') || {}; }
    catch { return {}; }
  });
  const supported = 'Notification' in window;
  const [pushEnabled, setPushEnabled] = useState(supported && Notification.permission === 'granted' && settings.push === true);
  const [soundEnabled, setSoundEnabled] = useState(settings.sound === true);
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied');

  async function togglePush(enabled: boolean) {
    if (!supported) return;
    let currentPermission = permission;
    if (enabled && currentPermission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      currentPermission = result;
      if (result !== 'granted') {
        setPushEnabled(false);
        return;
      }
    }
    if (enabled && currentPermission !== 'granted') return;
    setPushEnabled(enabled);
    localStorage.setItem('lifeos-notifications', JSON.stringify({ push: enabled, sound: soundEnabled }));
    if (enabled && currentPermission === 'granted') {
      new Notification('Life OS', { body: lang === 'id' ? 'Notifikasi aktif!' : 'Notifications enabled!', icon: '/icon.png' });
    }
  }

  function toggleSound(enabled: boolean) {
    setSoundEnabled(enabled);
    localStorage.setItem('lifeos-notifications', JSON.stringify({ push: pushEnabled, sound: enabled }));
    if (enabled) {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }

  const id = lang === 'id';

  return <section className="card notificationsCard" aria-labelledby="notifications-title">
    <div className="settingsSectionHeader">
      <div><span className="pill">{id ? 'Notifikasi' : 'Notifications'}</span><h2 id="notifications-title">{id ? 'Pengaturan Notifikasi' : 'Notification Settings'}</h2><p className="muted noMargin">{id ? 'Atur notifikasi push dan suara untuk tetap terinformasi.' : 'Configure push and sound notifications to stay informed.'}</p></div>
      <Bell size={21} aria-hidden="true" />
    </div>

    <div className="notificationToggle">
      <label htmlFor="push-toggle">
        <span>{id ? 'Notifikasi Push' : 'Push Notifications'}</span>
        <small>{id ? 'Tampilkan notifikasi sistem untuk pengingat dan update' : 'Show system notifications for reminders and updates'}</small>
      </label>
      <div className="toggleSwitch">
        <input type="checkbox" id="push-toggle" disabled={!supported || permission === 'denied'} checked={pushEnabled} onChange={(e) => void togglePush(e.target.checked)} />
        <span />
        <div className="toggleBg" />
      </div>
    </div>

    <div className="notificationToggle">
      <label htmlFor="sound-toggle">
        <span>{id ? 'Suara Notifikasi' : 'Notification Sound'}</span>
        <small>{id ? 'Mainkan suara saat notifikasi muncul' : 'Play sound when notifications appear'}</small>
      </label>
      <div className="toggleSwitch">
        <input type="checkbox" id="sound-toggle" checked={soundEnabled} onChange={(e) => toggleSound(e.target.checked)} />
        <span />
        <div className="toggleBg" />
      </div>
    </div>

    {permission === 'denied' && <p className="muted" style={{ fontSize: '12px', padding: '8px 10px', background: 'var(--surface2)', borderRadius: '8px' }}>{id ? 'Notifikasi diblokir oleh browser. Ubah pengaturan browser untuk mengaktifkan.' : 'Notifications blocked by browser. Change browser settings to enable.'}</p>}
  </section>;
}
