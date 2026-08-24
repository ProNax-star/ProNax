/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useMemo, useState } from 'react';
import { CalendarDays, Eye, Globe, Link2, Loader2, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { compactFormat } from '@/components/ui/animated-counter';
import { isSafeExternalUrl, toAbsoluteUrl, type ChannelProfile } from '@/lib/channelData';

interface Props {
  channel: ChannelProfile;
  totalViews: number;
  /** Signed-in viewer id — the business email is gated behind an account. */
  viewerId: string | null;
}

/** Renders a description, turning bare URLs into safe external links. */
function DescriptionWithLinks({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/(https?:\/\/[^\s]+)/g), [text]);
  return (
    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) && isSafeExternalUrl(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="text-primary hover:underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

/** Lightweight human check before revealing the business email. */
function EmailGate({ email, viewerId }: { email: string; viewerId: string | null }) {
  const [revealed, setRevealed] = useState(false);
  const [checking, setChecking] = useState(false);
  const challenge = useMemo(() => {
    const a = 3 + (email.length % 7);
    const b = 2 + (email.charCodeAt(0) % 5);
    return { a, b, answer: a + b };
  }, [email]);
  const [answer, setAnswer] = useState('');

  if (revealed) {
    return (
      <a href={`mailto:${email}`} className="text-sm text-primary hover:underline break-all">
        {email}
      </a>
    );
  }

  if (!viewerId) {
    return <p className="text-xs text-muted-foreground">Sign in to view the business email.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Anti-spam check: what is {challenge.a} + {challenge.b}?
      </p>
      <div className="flex items-center gap-2">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          inputMode="numeric"
          maxLength={3}
          className="w-16 bg-muted/40 border border-border/40 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary/60"
          aria-label="Anti-spam answer"
        />
        <button
          type="button"
          onClick={() => {
            setChecking(true);
            setTimeout(() => {
              setChecking(false);
              if (Number(answer) === challenge.answer) setRevealed(true);
              else toast.error('Incorrect answer, please try again.');
            }, 250);
          }}
          disabled={checking}
          className="px-3 py-1.5 rounded-lg text-xs border border-primary/40 text-primary hover:bg-primary/10 inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          {checking && <Loader2 className="w-3 h-3 animate-spin" />} Show email
        </button>
      </div>
    </div>
  );
}

export default function AboutTab({ channel, totalViews, viewerId }: Props) {
  const joined = new Date(channel.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Description</h2>
          {channel.bio ? (
            <DescriptionWithLinks text={channel.bio} />
          ) : (
            <p className="text-sm text-muted-foreground">This channel hasn't added a description yet.</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Links</h2>
          {channel.external_links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links added.</p>
          ) : (
            <ul className="space-y-1.5">
              {channel.external_links.map((link) => (
                <li key={link.url} className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <a
                    href={toAbsoluteUrl(link.url)}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {link.label || link.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Business inquiries
          </h2>
          {channel.business_email ? (
            <EmailGate email={channel.business_email} viewerId={viewerId} />
          ) : (
            <p className="text-sm text-muted-foreground">No business email provided.</p>
          )}
        </div>
      </section>

      <aside className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4 h-fit">
        <h2 className="text-sm font-semibold text-foreground">Channel details</h2>
        <Detail icon={CalendarDays} label="Joined" value={joined} />
        <Detail icon={Eye} label="Total views" value={`${compactFormat(totalViews)} views`} />
        <Detail icon={Globe} label="Handle" value={channel.handle ? `@${channel.handle}` : '—'} />
        <Detail icon={MapPin} label="Country" value={channel.country || 'Not specified'} />
        {channel.verified && <Detail icon={ShieldCheck} label="Status" value="Verified creator" />}
      </aside>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
