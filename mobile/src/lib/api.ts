import type { ParamValues } from './pricing';
import { supabase } from './supabase';

export type JobStatus = 'queued' | 'succeeded' | 'failed';

export type Job = {
  id: string;
  kind: 'image' | 'video';
  model_id: string;
  preset_id: string | null;
  prompt: string;
  status: JobStatus;
  cost: number;
  output_path: string | null;
  error: string | null;
  created_at: string;
};

export type GenerateInput = {
  modelId: string;
  presetId: string;
  prompt: string;
  /** Options from the model's ParamSpecs (duration, aspect_ratio, …). */
  params: ParamValues;
  /** Slot key → local file URI picked from the photo library. */
  images: Record<string, string>;
};

async function uploadInputImage(userId: string, slot: string, localUri: string): Promise<string> {
  return uploadInput(userId, slot, localUri, 'image/jpeg', 'jpg');
}

async function uploadInput(userId: string, slot: string, localUri: string, contentType: string, ext: string): Promise<string> {
  const body = await (await fetch(localUri)).arrayBuffer();
  const path = `${userId}/${Date.now()}-${slot}.${ext}`;
  const { error } = await supabase.storage.from('inputs').upload(path, body, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

/** Uploads photos, spends credits and queues a job on the server. Returns the new job id. */
export async function generate(input: GenerateInput): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  const userId = auth.user.id;

  const uploaded = await Promise.all(
    Object.entries(input.images).map(async ([slot, uri]) => [slot, await uploadInputImage(userId, slot, uri)] as const),
  );

  const { data, error } = await supabase.functions.invoke<{ jobId: string }>('generate', {
    body: {
      modelId: input.modelId,
      presetId: input.presetId,
      prompt: input.prompt,
      params: input.params,
      images: Object.fromEntries(uploaded),
    },
  });
  if (error) throw await toFriendlyError(error);
  if (!data) throw new Error('Empty response from generate');
  return data.jobId;
}

/** Runs a trend template or an app on the user's photo(s). Returns the new job id. */
export async function generateEffect(
  effectId: string,
  photoUri: string,
  opts: {
    choices?: Record<string, string | number>;
    photo2Uri?: string;
    /** Extra reference photos (Photoshoot) → photo2, photo3… */
    morePhotoUris?: string[];
    videoUri?: string;
    text?: string;
    consentSelf?: boolean;
  } = {},
): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  const uid = auth.user.id;
  const [photo, photo2, video, ...more] = await Promise.all([
    uploadInputImage(uid, 'photo', photoUri),
    opts.photo2Uri ? uploadInputImage(uid, 'photo2', opts.photo2Uri) : Promise.resolve(undefined),
    opts.videoUri ? uploadInput(uid, 'video', opts.videoUri, 'video/mp4', 'mp4') : Promise.resolve(undefined),
    ...(opts.morePhotoUris ?? []).map((uri, i) => uploadInputImage(uid, `photo${i + 2}`, uri)),
  ]);
  const extraPhotos = Object.fromEntries(more.map((path, i) => [`photo${i + 2}`, path]));

  const { data, error } = await supabase.functions.invoke<{ jobId: string }>('generate', {
    body: {
      effectId,
      choices: opts.choices,
      text: opts.text,
      consentSelf: opts.consentSelf,
      images: { photo, ...(photo2 ? { photo2 } : {}), ...extraPhotos, ...(video ? { video } : {}) },
    },
  });
  if (error) throw await toFriendlyError(error);
  if (!data) throw new Error('Empty response from generate');
  return data.jobId;
}

/** Runs a result action (Upscale, Add sound) on one of the user's finished jobs. */
export async function runJobAction(effectId: string, sourceJobId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ jobId: string }>('generate', {
    body: { effectId, sourceJobId },
  });
  if (error) throw await toFriendlyError(error);
  if (!data) throw new Error('Empty response from generate');
  return data.jobId;
}

const ERROR_MESSAGES: Record<string, string> = {
  unknown_effect: 'This template is no longer available.',
  unknown_job: 'This creation can’t be used for that.',
  consent_required: 'Confirm that this is you or that you have permission.',
  video_required: 'Choose a video first.',
  insufficient_credits: 'Not enough credits.',
  provider_error: 'The AI provider rejected the request. Your credits were refunded.',
  image_required: 'Choose a photo first.',
  invalid_params: 'One of the options is not supported by this model.',
  invalid_prompt: 'Write a slightly longer prompt.',
  unauthorized: 'Your session expired. Restart the app.',
};

/** Turns a FunctionsHttpError into an Error carrying the server's error code. */
async function toFriendlyError(error: unknown): Promise<Error & { code?: string }> {
  let code: string | undefined;
  let detail: string | undefined;
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    const body = (await ctx.json().catch(() => null)) as { error?: string; detail?: string } | null;
    code = body?.error;
    detail = body?.detail;
  }
  const message = (code && ERROR_MESSAGES[code]) ?? (error instanceof Error ? error.message : String(error));
  if (detail) console.warn('generate failed:', detail);
  return Object.assign(new Error(message), { code });
}

/** Short-lived URL for a private output file. */
export async function outputUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('outputs').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await supabase.auth.signOut();
}
