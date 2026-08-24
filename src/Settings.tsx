/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, EyeOff, History, LifeBuoy, Loader2, Lock, LogOut, Palette, PlayCircle, Shield, Smartphone, Upload, User, Video, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/loose';
import { SignInGate } from '@/components/auth/SignInGate';

const THEMES = [
  { id: 'deep-dark', label: 'Deep Dark', bg: '220 20% 4%', card: '220 20% 8%', primary: '190 100% 50%' },
  { id: 'midnight-blue', label: 'Midnight Blue', bg: '230 50% 6%', card: '230 45% 10%', primary: '210 100% 60%' },
  { id: 'amoled-black', label: 'AMOLED Black', bg: '0 0% 0%', card: '0 0% 4%', primary: '160 100% 50%' },
];

function applyTheme(id: string) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--background', t.bg);
  root.style.setProperty('--card', t.card);
  root.style.setProperty('--popover', t.card);
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--ring', t.primary);
  localStorage.setItem('pronax_theme', id);
}

export default function Settings() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [videoCount, setVideoCount] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appealMessage, setAppealMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('pronax_theme') || 'deep-dark');
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pronax_settings') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(data.user);
      setEmail(data.user?.email || '');
      if (data.user) {
        const [p, w, v] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle(),
          supabase.from('user_wallets').select('*').eq('user_id', data.user.id).maybeSingle(),
          supabase.from('videos').select('id', { count: 'exact', head: true }).eq('owner_id', data.user.id),
        ]);
        const prof = p.data as any;
        setProfile(prof);
        setWallet(w.data);
        setVideoCount(v.count ?? 0);
        setDisplayName(prof?.display_name ?? '');
        setBio(prof?.bio ?? '');
        setAvatarUrl(prof?.avatar_url ?? '');
      }
      applyTheme(theme);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const saveLocal = (key: string, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem('pronax_settings', JSON.stringify(next));
    toast({ title: 'Saved', description: 'Your preference was updated.' });
  };

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim(), bio: bio.trim(), email_notifications: settings.emailAlerts !== false } as any).eq('id', user.id);
    setBusy(false);
    if (error) return toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Channel settings saved' });
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast({ title: 'Image too large', description: 'Max 2 MB.', variant: 'destructive' });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const { error } = await supabase.from('profiles').update({ avatar_url: dataUrl } as any).eq('id', user.id);
    if (error) return toast({ title: 'Avatar failed', description: error.message, variant: 'destructive' });
    setAvatarUrl(dataUrl);
    toast({ title: 'Avatar updated' });
  };

  const updatePassword = async () => {
    if (password.length < 6) return toast({ title: 'Password too short', variant: 'destructive' });
    const { error } = await supabase.auth.updateUser({ password });
    setPassword('');
    toast({ title: error ? 'Password failed' : 'Password updated', description: error?.message });
  };

  const submitSupport = async () => {
    if (!user || appealMessage.trim().length < 10) return toast({ title: 'Write a longer message', variant: 'destructive' });
    setBusy(true);
    const { error } = await supabase.from('appeals').insert({ user_id: user.id, email: user.email, message: appealMessage.trim() });
    setBusy(false);
    if (error) return toast({ title: 'Request failed', description: error.message, variant: 'destructive' });
    setAppealMessage('');
    toast({ title: 'Support request sent' });
  };

  if (loading) return <main className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></main>;
  if (!user)
    return (
      <SignInGate
        title="Sign in for settings"
        description="Manage channel, privacy, wallet, and security settings from your account."
      />
    );

  const balance = Number(wallet?.balance ?? 0);
  const payoutProgress = Math.min(100, (balance / 10) * 100);

  return (
    <main className="container max-w-6xl px-4 py-8 pb-24 lg:pb-10">
      <h1 className="text-2xl lg:text-4xl font-display font-bold text-glow">Settings</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">ProNax account, channel, playback, privacy, monetization, and support controls.</p>

      <Tabs defaultValue="channel" className="space-y-6">
        <TabsList className="glass-strong p-1 h-auto flex-wrap">
          <TabsTrigger value="channel"><User className="w-4 h-4 mr-2" />Channel</TabsTrigger>
          <TabsTrigger value="privacy"><Lock className="w-4 h-4 mr-2" />Privacy</TabsTrigger>
          <TabsTrigger value="playback"><PlayCircle className="w-4 h-4 mr-2" />Playback</TabsTrigger>
          <TabsTrigger value="monetization"><Wallet className="w-4 h-4 mr-2" />Monetization</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-4 h-4 mr-2" />Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="w-4 h-4 mr-2" />Appearance</TabsTrigger>
          <TabsTrigger value="support"><LifeBuoy className="w-4 h-4 mr-2" />Support</TabsTrigger>
        </TabsList>

        <TabsContent value="channel" className="space-y-4">
          <Panel title="Channel customization" desc="Public profile shown on videos, comments, and search." full>
            <div className="grid lg:grid-cols-[auto_1fr] gap-5 w-full">
              <div className="flex lg:flex-col items-center gap-3">
                {avatarUrl ? <img src={avatarUrl} alt="Channel avatar" className="w-24 h-24 rounded-full object-cover ring-2 ring-primary/60" /> : <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">{(displayName || email || 'U')[0].toUpperCase()}</div>}
                <input ref={fileRef} type="file" hidden accept="image/*" onChange={uploadAvatar} />
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> Avatar</Button>
              </div>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3"><div><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div><div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
                <div><Label>About</Label><Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
                <Button onClick={saveProfile} disabled={busy}>Save channel</Button>
              </div>
            </div>
          </Panel>
          <div className="grid md:grid-cols-3 gap-3"><Stat icon={Video} label="Videos" value={String(videoCount)} /><Stat icon={Upload} label="Upload limit" value={`${profile?.upload_limit_mb ?? 1024} MB`} /><Stat icon={Bell} label="Email alerts" value={settings.emailAlerts === false ? 'Off' : 'On'} /></div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-3">
          <Toggle icon={Lock} label="Private profile" desc="Limit visible activity to approved followers." checked={!!settings.privateProfile} onChange={(v) => saveLocal('privateProfile', v)} />
          <Toggle icon={EyeOff} label="Hide liked videos" desc="Keep liked videos off your public profile." checked={!!settings.hideLikes} onChange={(v) => saveLocal('hideLikes', v)} />
          <Toggle icon={History} label="Hide watch history" desc="Do not expose recent viewing activity." checked={!!settings.hideHistory} onChange={(v) => saveLocal('hideHistory', v)} />
        </TabsContent>

        <TabsContent value="playback" className="space-y-3">
          <Toggle icon={PlayCircle} label="Autoplay next video" desc="Continue recommended playback automatically." checked={settings.autoplay !== false} onChange={(v) => saveLocal('autoplay', v)} />
          <Toggle icon={Smartphone} label="Data saver" desc="Prefer smoother low-bandwidth playback when networks are slow." checked={!!settings.dataSaver} onChange={(v) => saveLocal('dataSaver', v)} />
          <Toggle icon={Palette} label="Ambient neon player" desc="Keep polished lighting around the watch player." checked={settings.ambient !== false} onChange={(v) => saveLocal('ambient', v)} />
        </TabsContent>

        <TabsContent value="monetization" className="space-y-4">
          <Panel title="Wallet threshold" desc="Creator revenue and payout readiness." full>
            <div className="w-full space-y-3"><div className="grid md:grid-cols-3 gap-3"><Stat icon={Wallet} label="Available" value={`$${balance.toFixed(4)}`} /><Stat icon={Check} label="Total earned" value={`$${Number(wallet?.total_earned ?? 0).toFixed(4)}`} /><Stat icon={Wallet} label="Minimum payout" value="$10.00" /></div><Progress value={payoutProgress} /><Button asChild><Link to="/wallet">Open wallet</Link></Button></div>
          </Panel>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Panel title="Password" desc="Change account password."><div className="flex gap-2"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" /><Button onClick={updatePassword}>Change</Button></div></Panel>
          <Toggle icon={Shield} label="Two-factor authentication" desc="Require extra verification for sensitive actions." checked={!!settings.twoFactor} onChange={(v) => saveLocal('twoFactor', v)} />
          <Button variant="destructive" onClick={async () => { await supabase.auth.signOut(); navigate('/auth', { replace: true }); }}><LogOut className="w-4 h-4" /> Sign out securely</Button>
        </TabsContent>

        <TabsContent value="appearance"><Panel title="Theme" desc="Pick a neon viewing style." full><div className="grid sm:grid-cols-3 gap-3 w-full">{THEMES.map((t) => <button key={t.id} onClick={() => { setTheme(t.id); applyTheme(t.id); }} className={`glass p-4 rounded-xl border-2 text-left ${theme === t.id ? 'border-primary' : 'border-transparent'}`}><div className="h-16 rounded-md mb-2" style={{ background: `linear-gradient(135deg, hsl(${t.bg}), hsl(${t.primary}))` }} /><p className="text-sm font-semibold">{t.label}</p></button>)}</div></Panel></TabsContent>

        <TabsContent value="support" className="space-y-4"><Panel title="Support / appeal desk" desc="Send account, payout, moderation, or appeal requests to admins." full><div className="w-full space-y-3"><Textarea rows={5} value={appealMessage} onChange={(e) => setAppealMessage(e.target.value.slice(0, 1000))} placeholder="Describe the issue clearly…" /><Button onClick={submitSupport} disabled={busy}>Send request</Button></div></Panel></TabsContent>
      </Tabs>
    </main>
  );
}

function Panel({ title, desc, children, full }: { title: string; desc?: string; children: ReactNode; full?: boolean }) {
  return <div className="glass-strong rounded-xl border border-border/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h3 className="text-sm font-semibold">{title}</h3>{desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}</div><div className={full ? 'w-full' : 'shrink-0'}>{children}</div></div>;
}

function Toggle({ icon: Icon, label, desc, checked, onChange }: { icon: any; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <Panel title={label} desc={desc}><div className="flex items-center gap-3"><Icon className="w-4 h-4 text-primary" /><Switch checked={checked} onCheckedChange={onChange} /></div></Panel>;
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-xl glass border border-border/40 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="w-3.5 h-3.5 text-primary" />{label}</div><p className="text-lg font-display font-bold mt-1">{value}</p></div>;
}