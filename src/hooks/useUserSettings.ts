/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/loose';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoplay_videos: boolean;
  autoplay_shorts: boolean;
  muted: boolean;
  quality_preference: 'auto' | '360p' | '480p' | '720p' | '1080p' | '4k';
  captions_enabled: boolean;
  captions_language: string;
  mini_player_enabled: boolean;
  notifications_enabled: boolean;
  restricted_mode: boolean;
  playback_speed: number;
  custom_settings: Record<string, any>;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  language: 'en',
  autoplay_videos: true,
  autoplay_shorts: true,
  muted: false,
  quality_preference: 'auto',
  captions_enabled: false,
  captions_language: 'en',
  mini_player_enabled: true,
  notifications_enabled: true,
  restricted_mode: false,
  playback_speed: 1.0,
  custom_settings: {},
};

const STORAGE_KEY = 'pronax_user_settings';
const SYNC_DEBOUNCE_MS = 1000;

function getLocalSettings(): UserSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

function setLocalSettings(settings: UserSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage errors
  }
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Load settings from localStorage first (instant), then sync with DB
  useEffect(() => {
    const local = getLocalSettings();
    if (local) {
      setSettings(local);
    }
  }, []);

  // Load user and settings from database
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (user) {
          setUserId(user.id);

          // Call the RPC function to get settings
          const { data: dbSettings, error: rpcError } = await (supabase as any)
            .rpc('get_user_settings', { p_user_id: user.id });

          if (cancelled) return;

          if (rpcError) {
            console.error('Failed to load settings from DB:', rpcError);
            // Don't set error as warning - user can still use localStorage
          } else if (dbSettings && Array.isArray(dbSettings) && dbSettings.length > 0) {
            const dbData = dbSettings[0] as any;
            const mergedSettings: UserSettings = {
              theme: dbData.theme || DEFAULT_SETTINGS.theme,
              language: dbData.language || DEFAULT_SETTINGS.language,
              autoplay_videos: dbData.autoplay_videos ?? DEFAULT_SETTINGS.autoplay_videos,
              autoplay_shorts: dbData.autoplay_shorts ?? DEFAULT_SETTINGS.autoplay_shorts,
              muted: dbData.muted ?? DEFAULT_SETTINGS.muted,
              quality_preference: dbData.quality_preference || DEFAULT_SETTINGS.quality_preference,
              captions_enabled: dbData.captions_enabled ?? DEFAULT_SETTINGS.captions_enabled,
              captions_language: dbData.captions_language || DEFAULT_SETTINGS.captions_language,
              mini_player_enabled: dbData.mini_player_enabled ?? DEFAULT_SETTINGS.mini_player_enabled,
              notifications_enabled: dbData.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
              restricted_mode: dbData.restricted_mode ?? DEFAULT_SETTINGS.restricted_mode,
              playback_speed: dbData.playback_speed ?? DEFAULT_SETTINGS.playback_speed,
              custom_settings: dbData.custom_settings || DEFAULT_SETTINGS.custom_settings,
            };
            setSettings(mergedSettings);
            setLocalSettings(mergedSettings);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load settings:', err);
          // Don't set error as warning - user can still use localStorage
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  // Update settings with debounced sync to database
  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      setLocalSettings(newSettings);

      if (userId) {
        try {
          // Build params object only with defined values
          const params: any = { p_user_id: userId };
          if (updates.theme !== undefined) params.p_theme = updates.theme;
          if (updates.language !== undefined) params.p_language = updates.language;
          if (updates.autoplay_videos !== undefined) params.p_autoplay_videos = updates.autoplay_videos;
          if (updates.autoplay_shorts !== undefined) params.p_autoplay_shorts = updates.autoplay_shorts;
          if (updates.muted !== undefined) params.p_muted = updates.muted;
          if (updates.quality_preference !== undefined) params.p_quality_preference = updates.quality_preference;
          if (updates.captions_enabled !== undefined) params.p_captions_enabled = updates.captions_enabled;
          if (updates.captions_language !== undefined) params.p_captions_language = updates.captions_language;
          if (updates.mini_player_enabled !== undefined) params.p_mini_player_enabled = updates.mini_player_enabled;
          if (updates.notifications_enabled !== undefined) params.p_notifications_enabled = updates.notifications_enabled;
          if (updates.restricted_mode !== undefined) params.p_restricted_mode = updates.restricted_mode;
          if (updates.playback_speed !== undefined) params.p_playback_speed = updates.playback_speed;
          if (updates.custom_settings !== undefined) params.p_custom_settings = updates.custom_settings;

          await (supabase as any).rpc('update_user_settings', params);
        } catch (err) {
          console.error('Failed to sync settings to DB:', err);
          setError(err as Error);
        }
      }
    },
    [settings, userId]
  );

  // Convenience setters for common settings
  const setTheme = useCallback(
    (theme: 'light' | 'dark' | 'system') => updateSettings({ theme }),
    [updateSettings]
  );

  const setAutoplayVideos = useCallback(
    (value: boolean) => updateSettings({ autoplay_videos: value }),
    [updateSettings]
  );

  const setAutoplayShorts = useCallback(
    (value: boolean) => updateSettings({ autoplay_shorts: value }),
    [updateSettings]
  );

  const setMuted = useCallback(
    (value: boolean) => updateSettings({ muted: value }),
    [updateSettings]
  );

  const setQualityPreference = useCallback(
    (value: 'auto' | '360p' | '480p' | '720p' | '1080p' | '4k') =>
      updateSettings({ quality_preference: value }),
    [updateSettings]
  );

  const setCaptionsEnabled = useCallback(
    (value: boolean) => updateSettings({ captions_enabled: value }),
    [updateSettings]
  );

  const setMiniPlayerEnabled = useCallback(
    (value: boolean) => updateSettings({ mini_player_enabled: value }),
    [updateSettings]
  );

  const setNotificationsEnabled = useCallback(
    (value: boolean) => updateSettings({ notifications_enabled: value }),
    [updateSettings]
  );

  const setRestrictedMode = useCallback(
    (value: boolean) => updateSettings({ restricted_mode: value }),
    [updateSettings]
  );

  const setPlaybackSpeed = useCallback(
    (value: number) => updateSettings({ playback_speed: value }),
    [updateSettings]
  );

  const setCustomSetting = useCallback(
    (key: string, value: any) => {
      const newCustomSettings = { ...settings.custom_settings, [key]: value };
      updateSettings({ custom_settings: newCustomSettings });
    },
    [settings.custom_settings, updateSettings]
  );

  const getCustomSetting = useCallback(
    (key: string, defaultValue?: any) => {
      return settings.custom_settings[key] ?? defaultValue;
    },
    [settings.custom_settings]
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    setTheme,
    setAutoplayVideos,
    setAutoplayShorts,
    setMuted,
    setQualityPreference,
    setCaptionsEnabled,
    setMiniPlayerEnabled,
    setNotificationsEnabled,
    setRestrictedMode,
    setPlaybackSpeed,
    setCustomSetting,
    getCustomSetting,
  };
}