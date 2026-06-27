import { FormEvent, useEffect, useState } from 'react';
import { NotificationSettings, getSettings, updateSettings } from '../api';

const DEFAULTS: NotificationSettings = {
  emailEnabled: false,
  smsEnabled: false,
  marketingEnabled: false,
};

export default function Settings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getSettings()
      .then((data) => setSettings(data.settings))
      .catch((e) => setError((e as Error).message));
  }, []);

  function toggle(key: keyof NotificationSettings) {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const data = await updateSettings(settings);
      setSettings(data.settings);
      setSuccess('Settings saved.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Notification Settings</h1>
        <form onSubmit={handleSubmit}>
          <label>
            <input
              type="checkbox"
              data-testid="settings-email"
              checked={settings.emailEnabled}
              onChange={() => toggle('emailEnabled')}
            />{' '}
            Email notifications
          </label>
          <label>
            <input
              type="checkbox"
              data-testid="settings-sms"
              checked={settings.smsEnabled}
              onChange={() => toggle('smsEnabled')}
            />{' '}
            SMS notifications
          </label>
          <label>
            <input
              type="checkbox"
              data-testid="settings-marketing"
              checked={settings.marketingEnabled}
              onChange={() => toggle('marketingEnabled')}
            />{' '}
            Marketing communications
          </label>
          {error && <div className="error" data-testid="settings-error">{error}</div>}
          {success && (
            <div data-testid="settings-success" style={{ color: '#00875a', margin: '8px 0' }}>
              {success}
            </div>
          )}
          <button type="submit" data-testid="settings-submit">Save Settings</button>
        </form>
      </div>
    </div>
  );
}
