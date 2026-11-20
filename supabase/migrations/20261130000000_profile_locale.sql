-- App language of the user's device (e.g. "de", "pt-BR", "zh-Hant"), saved with the
-- push token so fal-webhook can send the "your video is ready" push in that language.
alter table public.profiles add column if not exists locale text check (char_length(locale) <= 16);

-- Like push_token, the app may write this column (and never the balance).
grant update (locale) on public.profiles to authenticated;
