// One short banner when a newer build is ready. It never covers the navigation or the match bar.
import { useEffect, useState } from 'react';
import type { Strings } from '../i18n';
import { applyWebUpdate, openApkUpdate, watchUpdates, type UpdateState } from '../update';

export function UpdateBanner({ t }: { t: Strings }) {
  const [state, setState] = useState<UpdateState>({});
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => watchUpdates((s) => setState((old) => ({ ...old, ...s }))), []);
  const shown = [state.apk && `apk:${state.apk.version}`, state.web && `web:${state.web.build}`].filter((k): k is string => !!k && !hidden.includes(k));
  const key = shown[0];
  if (!key) return null;
  const apk = key.startsWith('apk:');
  return (
    <div className="v2update" role="status">
      <span>{apk ? t.updApk(state.apk!.version) : t.updWeb(state.web!.version)}</span>
      <button className="btn btn--accent btn--sm" onClick={() => (apk ? openApkUpdate() : applyWebUpdate())}>{apk ? t.updApkBtn : t.updWebBtn}</button>
      <button className="btn btn--ghost on-ground btn--sm" onClick={() => setHidden([...hidden, key])}>{t.updLater}</button>
    </div>
  );
}
