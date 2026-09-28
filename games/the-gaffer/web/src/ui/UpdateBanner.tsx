// One short banner when a newer version is ready. It never covers the tab bar or the match controls.
import { useEffect, useState } from 'react';
import type { Strings } from '../i18n';
import { applyWebUpdate, openApkUpdate, watchUpdates, type UpdateState } from '../update';

export function UpdateBanner({ t }: { t: Strings }) {
  const [state, setState] = useState<UpdateState>({});
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => watchUpdates((s) => setState((old) => ({ ...old, ...s }))), []);
  // The app update comes first; "Later" on it still lets a ready web update through.
  const shown = [state.apk && `apk:${state.apk.version}`, state.web && `web:${state.web.build}`].filter((k): k is string => !!k && !hidden.includes(k));
  const key = shown[0];
  if (!key) return null;
  const apk = key.startsWith('apk:');
  return (
    <div className="g-update" role="status">
      <span className="g-update-dot" aria-hidden="true" />
      <span className="g-update-text">{apk ? t.updApk(state.apk!.version) : t.updWeb(state.web!.version)}</span>
      <button className="btn sm primary" onClick={() => (apk ? openApkUpdate() : applyWebUpdate())}>{apk ? t.updApkBtn : t.updWebBtn}</button>
      <button className="btn sm ghost" onClick={() => setHidden([...hidden, key])}>{t.updLater}</button>
    </div>
  );
}
