import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserSettings, DashboardWidgetConfig, ThemeColor } from '../types';

const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'quick_actions', enabled: true, order: 10, size: 'md' },
  { id: 'agenda_today', enabled: true, order: 20, size: 'lg' },
  { id: 'sales_pulse', enabled: true, order: 30, size: 'md' },
  { id: 'active_groups', enabled: true, order: 40, size: 'md' },
  { id: 'tasks_focus', enabled: true, order: 50, size: 'md' },
];

const ALLOWED_THEME_COLORS: ThemeColor[] = [
  'indigo', 'blue', 'emerald', 'amber', 'violet', 'rose', 'slate', 'cyan', 'teal',
];

const sanitizeThemeColor = (v: any): ThemeColor => {
  const s = String(v || 'indigo') as ThemeColor;
  return (ALLOWED_THEME_COLORS as string[]).includes(s) ? s : 'indigo';
};

const sanitizeWidgets = (v: any): DashboardWidgetConfig[] => {
  if (!Array.isArray(v)) return DEFAULT_DASHBOARD_WIDGETS;

  const out = v
    .map((w) => ({
      id: String(w?.id || ''),
      enabled: Boolean(w?.enabled),
      order: Number.isFinite(Number(w?.order)) ? Number(w.order) : 999,
      size: w?.size === 'sm' || w?.size === 'md' || w?.size === 'lg' ? w.size : 'md',
    }))
    .filter((w) => Boolean(w.id)) as DashboardWidgetConfig[];

  return out.length ? out : DEFAULT_DASHBOARD_WIDGETS;
};

const sanitizeSettings = (data: any, displayNameFallback?: string): UserSettings => {
  const userName = String(data?.userName || displayNameFallback || 'Utilisateur');

  return {
    userName,
    themeColor: sanitizeThemeColor(data?.themeColor),
    darkMode: Boolean(data?.darkMode),
    autoDarkMode: Boolean(data?.autoDarkMode),
    googleSync: Boolean(data?.googleSync),
    whatsappSync: Boolean(data?.whatsappSync),
    weatherCity: typeof data?.weatherCity === 'string' ? data.weatherCity : undefined,

    // ✅ Toujours présent
    dashboardWidgets: sanitizeWidgets(data?.dashboardWidgets),
  };
};

export const useUserSettings = (uid?: string, displayName?: string) => {
  const [settings, setSettings] = useState<UserSettings>(() => ({
    userName: displayName || 'Utilisateur',
    themeColor: 'indigo',
    darkMode: false,
    autoDarkMode: false,
    googleSync: false,
    whatsappSync: false,

    // ✅ Always present in state
    dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
  }));

  const [loading, setLoading] = useState<boolean>(!!uid);
  const [error, setError] = useState<string | null>(null);

  const bootstrappedRef = useRef(false);

  // users/{uid}/settings/app
  const ref = useMemo(() => {
    if (!uid) return null;
    return doc(db, 'users', uid, 'settings', 'app');
  }, [uid]);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        try {
          if (!snap.exists()) {
            if (!bootstrappedRef.current) {
              bootstrappedRef.current = true;

              const initial = sanitizeSettings({}, displayName);
              setSettings(initial);

              await setDoc(
                ref,
                { ...initial, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
                { merge: true }
              );
            }

            setLoading(false);
            setError(null);
            return;
          }

          setSettings(sanitizeSettings(snap.data(), displayName));
          setLoading(false);
          setError(null);
        } catch (e: any) {
          setError(e?.message || 'Erreur Firestore');
          setLoading(false);
        }
      },
      (err) => {
        setError(err?.message || 'Erreur Firestore');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [ref, displayName]);

  const saveSettings = async (patch: Partial<UserSettings>) => {
    if (!ref) return;

    const safePatch: Partial<UserSettings> = {
      ...patch,
      themeColor: patch.themeColor ? sanitizeThemeColor(patch.themeColor) : undefined,
      dashboardWidgets: patch.dashboardWidgets ? sanitizeWidgets(patch.dashboardWidgets) : undefined,
    };

    Object.keys(safePatch).forEach((k) => {
      // @ts-ignore
      if (safePatch[k] === undefined) delete safePatch[k];
    });

    await setDoc(ref, { ...safePatch, updatedAt: serverTimestamp() }, { merge: true });
  };

  return { settings, setSettings, saveSettings, loading, error };
};
