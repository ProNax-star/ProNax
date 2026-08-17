// Client-side content moderation and file validation helpers.
// Defense-in-depth: the database trigger `moderate_comment` / `moderate_video_meta`
// is the source of truth, this just gives instant UX feedback.

const BAD_WORDS = [
  'fuck','shit','bitch','asshole','bastard','cunt','dick','pussy','slut','whore',
  'nigger','nigga','faggot','retard','rape','kill yourself','kys',
  'chutiya','madarchod','behenchod','bhosdi','randi','gandu','harami','kutta',
  'lund','chut','suar',
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PROFANITY_RE = new RegExp(
  `(^|[^a-z])(${BAD_WORDS.map(escapeRe).join('|')})([^a-z]|$)`,
  'i',
);

export function containsProfanity(text: string | null | undefined): boolean {
  if (!text) return false;
  return PROFANITY_RE.test(text.toLowerCase());
}

/**
 * AI-Powered Context-Aware Moderation & Sentiment Analysis
 */
export async function analyzeContentWithAI(options: {
  text: string;
  title?: string;
  sentimentAnalysis?: boolean;
  toxicityDetection?: boolean;
  spamDetection?: boolean;
}) {
  try {
    const { analyzeContentWithAI: aiClientCall } = await import('@/pronax-studio/geminiClient');
    return await aiClientCall(options);
  } catch (err) {
    console.warn('AI moderation client error, falling back to local analysis:', err);
    const text = options.text || '';
    const profanity = containsProfanity(text) || (options.title ? containsProfanity(options.title) : false);
    const spam = /(https?:\/\/[^\s]+){3,}|free robux|whatsapp me|crypto profit 100x/i.test(text);
    return {
      isApproved: !profanity && !spam,
      flagged: profanity || spam,
      toxicityScore: profanity ? 0.85 : 0.05,
      spamScore: spam ? 0.90 : 0.02,
      sentiment: profanity ? ('toxic' as const) : ('neutral' as const),
      categories: {
        toxicity: profanity,
        hateSpeech: false,
        harassment: false,
        spam: spam,
        copyrightRisk: false,
      },
      reasoning: profanity ? 'Inappropriate language detected' : spam ? 'Excessive links/spam text detected' : 'Clean text verified',
      suggestedAction: profanity ? ('auto_block' as const) : spam ? ('flag_for_review' as const) : ('approve' as const),
    };
  }
}


/** Returns a cleaned string with bad words replaced by ****, or null if input is empty. */
export function sanitizeText(text: string): string {
  return text.replace(new RegExp(BAD_WORDS.map(escapeRe).join('|'), 'gi'), (m) => '*'.repeat(m.length));
}

/** Throws Error with a user-facing message if the text is invalid. */
export function assertCleanText(text: string, kind: 'comment' | 'title' | 'description' = 'comment') {
  const t = text?.trim() ?? '';
  if (!t) throw new Error(`${kind} cannot be empty`);
  if (t.length > 5000) throw new Error(`${kind} is too long`);
  if (containsProfanity(t)) throw new Error(`Blocked: ${kind} contains inappropriate language`);
}

// ---------- File validation ----------

export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'] as const;
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const MAX_VIDEO_BYTES_DEFAULT = 2 * 1024 * 1024 * 1024; // 2 GB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_VIDEO_BYTES = 4 * 1024; // 4 KB — anything smaller is corrupt/empty

/** Reads the first 16 bytes and verifies the magic signature matches the claimed MIME. */
async function sniffMagic(file: File): Promise<string> {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function looksLikeVideo(hex: string, mime: string): boolean {
  // MP4 / MOV: bytes 4..7 == 'ftyp' (66 74 79 70)
  if ((mime === 'video/mp4' || mime === 'video/quicktime') && hex.slice(8, 16) === '66747970') return true;
  // WebM / MKV: starts with 1A 45 DF A3 (EBML)
  if ((mime === 'video/webm' || mime === 'video/x-matroska') && hex.startsWith('1a45dfa3')) return true;
  return false;
}

function looksLikeImage(hex: string, mime: string): boolean {
  if (mime === 'image/jpeg' && hex.startsWith('ffd8ff')) return true;
  if (mime === 'image/png' && hex.startsWith('89504e470d0a1a0a')) return true;
  if (mime === 'image/webp' && hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return true;
  return false;
}

export async function validateVideoFile(file: File, maxBytes = MAX_VIDEO_BYTES_DEFAULT): Promise<void> {
  if (!file || file.size === 0) throw new Error('Video file is empty or corrupted');
  if (file.size < MIN_VIDEO_BYTES) throw new Error('Video file looks corrupted (too small)');
  if (file.size > maxBytes) throw new Error(`Video exceeds your ${(maxBytes / 1024 / 1024).toFixed(0)} MB upload limit`);
  // Check if file type starts with any allowed MIME type (handles codec parameters like video/webm;codecs=vp9,opus)
  const baseType = file.type.split(';')[0];
  if (!ALLOWED_VIDEO_MIME.includes(baseType as any)) {
    throw new Error('Only MP4, WebM, MOV, MKV files are allowed');
  }
  const hex = await sniffMagic(file);
  if (!looksLikeVideo(hex, baseType)) {
    throw new Error('File contents do not match a real video — possibly malicious or corrupted');
  }
}

export async function validateImageFile(file: File): Promise<void> {
  if (!file || file.size === 0) throw new Error('Thumbnail is empty or corrupted');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Thumbnail must be smaller than 5 MB');
  if (!ALLOWED_IMAGE_MIME.includes(file.type as any)) {
    throw new Error('Thumbnail must be JPG, PNG, or WebP');
  }
  const hex = await sniffMagic(file);
  if (!looksLikeImage(hex, file.type)) {
    throw new Error('Thumbnail contents do not match a real image — possibly malicious');
  }
}
