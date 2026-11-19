export type ShowcaseItem = {
  id: string;
  title: string;
  subtitle?: string;
  duration?: string;
  timestamp?: string;
  category: 'video' | 'presets' | 'edit' | 'loops';
  aspectRatio: number;
  imageUrl: string;
  videoUrl?: string;
  prompt: string;
  modelId: string;
  modelName: string;
  presetId?: string;
  credits: number;
  tags?: string[];
  author: {
    name: string;
    avatar: string;
    badge?: string;
  };
  filmstrip?: string[];
};

export type DeckCardItem = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  prompt: string;
  modelId: string;
  modelName: string;
  presetId: string;
  credits: number;
  tags: string[];
};

export type ReelItem = {
  id: string;
  title: string;
  views: string;
  likes: string;
  duration: string;
  audio: string;
  thumbnailUrl: string;
  videoUrl?: string;
  prompt: string;
  modelId: string;
  modelName: string;
  presetId: string;
  credits: number;
  tags: string[];
  creator: {
    name: string;
    avatar: string;
    handle: string;
  };
};

export const CREATORS = [
  {
    id: 'c1',
    name: 'Space Tom',
    handle: '@spacetom',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    highlighted: false,
  },
  {
    id: 'c2',
    name: 'Crazy Soul',
    handle: '@crazysoul',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
    badge: '★ PRO',
    highlighted: true,
  },
  {
    id: 'c3',
    name: 'Lammy',
    handle: '@lammy',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    highlighted: false,
  },
  {
    id: 'c4',
    name: 'Agni',
    handle: '@agni_vision',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    highlighted: false,
  },
  {
    id: 'c5',
    name: 'Lee',
    handle: '@lee_art',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    highlighted: false,
  },
];

/** Trending 3D Fan Deck Cards mapped to REAL backend models */
export const DECK_CARDS: DeckCardItem[] = [
  {
    id: 'deck-yellow-street',
    title: 'Solar Courtway',
    subtitle: 'Kling 4 · 00m 18s',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    prompt: 'Haute couture fashion model in vibrant yellow cropped hoodie and matching sweatpants standing on outdoor concrete basketball court, clear cyan sky, harsh cinematic sunlight, sharp geometric shadows, slow 360 camera arc',
    modelId: 'kling/v4/text-to-video',
    modelName: 'Kling 4',
    presetId: 'orbit',
    credits: 90,
    tags: ['#Streetwear', '#Fashion', '#Kling4'],
  },
  {
    id: 'deck-dark-silhouette',
    title: 'Obsidian Velvet',
    subtitle: 'MiniMax H3 · 00m 24s',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
    prompt: 'High-fashion editorial model draped in oversized teal wool coat against dark charcoal haze, rim light caressing silhouette, subtle volumetric smoke, 35mm anamorphic camera push-in',
    modelId: 'minimax/h3/text-to-video',
    modelName: 'MiniMax H3',
    presetId: 'dolly-in',
    credits: 60,
    tags: ['#Editorial', '#Cinematic', '#MiniMax'],
  },
  {
    id: 'deck-dark-floral',
    title: 'Baroque Peonies',
    subtitle: 'Flux 3 · Ultra Still',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    prompt: 'Dutch golden age classical oil painting of blooming peonies and dark roses in antique vase on obsidian stone slab, dramatic chiaroscuro candle lighting, hyper-realistic oil textures',
    modelId: 'blackforestlabs/flux-3/text-to-image',
    modelName: 'Flux 3',
    presetId: 'cinematic-still',
    credits: 6,
    tags: ['#Baroque', '#Art', '#Flux3'],
  },
  {
    id: 'deck-cyan-vapor',
    title: 'Cyan Luminescence',
    subtitle: 'Wan 3 · 00m 15s',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    prompt: 'Submerged crystal neon glass tubes in deep blue ocean water illuminating free diver, radiant cyan caustics shimmering on skin, slow fluid motion',
    modelId: 'alibaba/wan-3.0/text-to-video',
    modelName: 'Wan 3',
    presetId: 'orbit',
    credits: 45,
    tags: ['#FluidVFX', '#Underwater', '#Wan3'],
  },
  {
    id: 'deck-street-drift',
    title: 'Tokyo Street Drift',
    subtitle: 'Seedance 2 · 00m 22s',
    imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&auto=format&fit=crop&q=80',
    prompt: 'Teenage boy in retro knitwear leaning against lamp post in Shibuya alley at twilight, anime-grade vibrant color grading, handheld gentle camera motion',
    modelId: 'bytedance/seedance-2.0/fast/text-to-video',
    modelName: 'Seedance 2',
    presetId: 'handheld',
    credits: 40,
    tags: ['#AnimeVibe', '#Tokyo', '#Seedance2'],
  },
  {
    id: 'deck-ethereal-crown',
    title: 'Queen of Wild Thorns',
    subtitle: 'Kling 4 · 00m 20s',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    prompt: 'Surreal gothic queen adorned in wild thorn and coral crown, porcelain skin with crystal blue eyes, atmospheric fog and drifting snow, slow cinematic dolly-in',
    modelId: 'kling/v4/text-to-video',
    modelName: 'Kling 4',
    presetId: 'dolly-in',
    credits: 90,
    tags: ['#Fantasy', '#Crown', '#Kling4'],
  },
];

/** Trending Reels matching the backend models */
export const REELS_SAMPLES: ReelItem[] = [
  {
    id: 'reel-1',
    title: 'Yellow Streetwear Runway',
    views: '48.2k',
    likes: '4.6k',
    duration: '0:18',
    audio: '♪ Cyber Sunset - 124 BPM',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    prompt: 'Haute couture model in yellow cropped hoodie and matching joggers on sunlit outdoor basketball court, clear blue sky, sharp architectural shadows, slow rotational orbit',
    modelId: 'kling/v4/text-to-video',
    modelName: 'Kling 4',
    presetId: 'orbit',
    credits: 90,
    tags: ['#Streetwear', '#Kling4'],
    creator: {
      name: 'Elena Rostova',
      handle: '@elena_art',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'reel-2',
    title: 'Eternity in Souls Skate',
    views: '82.9k',
    likes: '9.3k',
    duration: '0:24',
    audio: '♪ Tokyo Drift Waves - Original',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
    prompt: 'Vibrant pink oversized blazer with pink high heels riding a classic vintage skateboard along city asphalt, anamorphic cinema lens, soft golden dust, 35mm grain',
    modelId: 'minimax/h3/text-to-video',
    modelName: 'MiniMax H3',
    presetId: 'handheld',
    credits: 60,
    tags: ['#FashionSkate', '#MiniMax'],
    creator: {
      name: 'Crazy Soul',
      handle: '@crazysoul',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'reel-3',
    title: 'Crown of Wild Corals',
    views: '115k',
    likes: '14.2k',
    duration: '0:20',
    audio: '♪ Dark Ambient Echoes - Soundlab',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    prompt: 'Ethereal high-fashion queen wearing an intricate crown of white branches and corals, icy blue gaze, mist rolling into camera frame, slow push-in',
    modelId: 'kling/v4/text-to-video',
    modelName: 'Kling 4',
    presetId: 'dolly-in',
    credits: 90,
    tags: ['#Ethereal', '#Kling4'],
    creator: {
      name: 'Agni',
      handle: '@agni_vision',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'reel-4',
    title: 'Shimmering Free Diver',
    views: '34.7k',
    likes: '3.1k',
    duration: '0:15',
    audio: '♪ Underwater Ambient Loop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    prompt: 'Free diver gliding down into crystal turquoise water with refractive sun rays illuminating bubbles, ultra-smooth fluid dynamics',
    modelId: 'alibaba/wan-3.0/text-to-video',
    modelName: 'Wan 3',
    presetId: 'orbit',
    credits: 45,
    tags: ['#OceanVFX', '#Wan3'],
    creator: {
      name: 'Space Tom',
      handle: '@spacetom',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'reel-5',
    title: 'Velvet Cinema Auditorium',
    views: '29.1k',
    likes: '2.5k',
    duration: '0:30',
    audio: '♪ Cinematic String Quartet in D',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
    prompt: 'Infinite empty vintage theater with crimson velvet seats, single dusty golden spotlight beam cutting through darkness, slow steady tracking camera',
    modelId: 'bytedance/seedance-2.0/fast/text-to-video',
    modelName: 'Seedance 2',
    presetId: 'dolly-in',
    credits: 40,
    tags: ['#Cinema', '#Seedance2'],
    creator: {
      name: 'Lammy',
      handle: '@lammy',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'reel-6',
    title: 'Ballerina Silk Mirage',
    views: '61.4k',
    likes: '7.8k',
    duration: '0:16',
    audio: '♪ Ethereal Piano Suite',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&auto=format&fit=crop&q=80',
    prompt: 'Contemporary ballerina spinning in voluminous pink organza silk gown against dark atmospheric void, motion blur, slow 120fps physics',
    modelId: 'lightricks/ltx-2.5/text-to-video/fast',
    modelName: 'LTX 2.5 Fast',
    presetId: 'orbit',
    credits: 25,
    tags: ['#Ballet', '#LTXFast'],
    creator: {
      name: 'Lee',
      handle: '@lee_art',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    },
  },
];

export const RECOMMENDED_PRESET = {
  id: 'preset-surreal-renaissance',
  title: 'Surreal Renaissance',
  subtitle: 'Flux 3 · Soft Volumetric Brush',
  category: 'Presets',
  imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1000&auto=format&fit=crop&q=80',
  prompt: 'Classical renaissance portrait blended with futuristic surreal liquid brushstrokes, dramatic chiaroscuro, 8k museum quality',
  modelId: 'blackforestlabs/flux-3/text-to-image',
  modelName: 'Flux 3',
  presetId: 'cinematic-still',
  credits: 6,
  badge: 'Trending Preset',
};

export const FILMSTRIP_FRAMES = [
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=200&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=200&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&auto=format&fit=crop&q=60',
];

export const FEATURED_SHOWCASE: ShowcaseItem[] = [
  {
    id: 'eternity-in-souls',
    title: 'Eternity in Souls',
    subtitle: 'Yesterday, 1:24 pm | 00m 24s',
    timestamp: 'Yesterday, 1:24 pm',
    duration: '00m 24s',
    category: 'video',
    aspectRatio: 0.88,
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    prompt: 'Haute couture model in vibrant pink blazer and heels riding a vintage skateboard on city asphalt, cinematic anamorphic lens, 35mm grain',
    modelId: 'minimax/h3/text-to-video',
    modelName: 'MiniMax H3',
    presetId: 'handheld',
    credits: 60,
    tags: ['#FashionSkate', '#MiniMax'],
    author: {
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
    filmstrip: FILMSTRIP_FRAMES,
  },
  {
    id: 'deck-yellow-street',
    title: 'Solar Courtway',
    subtitle: 'Today, 10:15 am | 00m 18s',
    timestamp: 'Today, 10:15 am',
    duration: '00m 18s',
    category: 'video',
    aspectRatio: 0.8,
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1000&auto=format&fit=crop&q=80',
    prompt: 'Haute couture fashion model in vibrant yellow cropped hoodie and matching joggers on outdoor concrete basketball court, clear cyan sky, harsh cinematic sunlight, sharp geometric shadows, slow 360 camera arc',
    modelId: 'kling/v4/text-to-video',
    modelName: 'Kling 4',
    presetId: 'orbit',
    credits: 90,
    tags: ['#Streetwear', '#Kling4'],
    author: {
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
    filmstrip: FILMSTRIP_FRAMES,
  },
  {
    id: 'ethereal-crown',
    title: 'Crown of Wild Thorns',
    subtitle: 'Today, 11:05 am | 00m 18s',
    timestamp: 'Today, 11:05 am',
    duration: '00m 18s',
    category: 'video',
    aspectRatio: 0.65,
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop&q=80',
    prompt: 'Ethereal queen adorned in delicate botanical coral crown, porcelain skin with piercing icy stare, misty gothic atmosphere',
    modelId: 'kling/v4/text-to-video',
    modelName: 'Kling 4',
    presetId: 'dolly-in',
    credits: 90,
    tags: ['#GothicQueen', '#Kling4'],
    author: {
      name: 'Crazy Soul',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
      badge: 'PRO',
    },
    filmstrip: FILMSTRIP_FRAMES,
  },
  {
    id: 'ocean-drift',
    title: 'Coastline Reverie',
    subtitle: '2 days ago | 00m 15s',
    timestamp: '2 days ago',
    duration: '00m 15s',
    category: 'video',
    aspectRatio: 0.85,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    prompt: 'Two silhouettes in airy summer linen standing on shimmering tidal sand, golden hour reflections',
    modelId: 'bytedance/seedance-2.0/fast/text-to-video',
    modelName: 'Seedance 2',
    presetId: 'orbit',
    credits: 40,
    tags: ['#Summer', '#Seedance2'],
    author: {
      name: 'Space Tom',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    },
    filmstrip: FILMSTRIP_FRAMES,
  },
  {
    id: 'cyber-street',
    title: 'Tokyo Street Drift',
    subtitle: '3 days ago | 00m 22s',
    timestamp: '3 days ago',
    duration: '00m 22s',
    category: 'video',
    aspectRatio: 0.72,
    imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&auto=format&fit=crop&q=80',
    prompt: 'Futuristic streetwear youth leaning nonchalantly against street pole, neon pastel lighting, Shibuya night alley',
    modelId: 'bytedance/seedance-2.0/fast/text-to-video',
    modelName: 'Seedance 2',
    presetId: 'handheld',
    credits: 40,
    tags: ['#Tokyo', '#Seedance2'],
    author: {
      name: 'Lammy',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    },
    filmstrip: FILMSTRIP_FRAMES,
  },
  {
    id: 'draped-gold',
    title: 'Saffron Drapes',
    subtitle: '4 days ago | Preset',
    timestamp: '4 days ago',
    duration: 'Preset',
    category: 'presets',
    aspectRatio: 1.0,
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
    prompt: 'Sculptural model gracefully draped in radiant saffron and gold raw silk, chiaroscuro shadow studio',
    modelId: 'fal-ai/flux-2-pro',
    modelName: 'Flux 2 Pro',
    presetId: 'cinematic-still',
    credits: 4,
    tags: ['#Gold', '#Flux2Pro'],
    author: {
      name: 'Agni',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'velvet-cinema',
    title: 'Velvet Horizon',
    subtitle: '5 days ago | 00m 30s',
    timestamp: '5 days ago',
    duration: '00m 30s',
    category: 'video',
    aspectRatio: 0.78,
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
    prompt: 'Infinite empty vintage theater with crimson velvet seats and dusty golden spotlight beam',
    modelId: 'minimax/h3/text-to-video',
    modelName: 'MiniMax H3',
    presetId: 'dolly-in',
    credits: 60,
    tags: ['#Auditorium', '#MiniMax'],
    author: {
      name: 'Crazy Soul',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
    },
    filmstrip: FILMSTRIP_FRAMES,
  },
  {
    id: 'pink-tulle',
    title: 'Ballet Mirage',
    subtitle: 'Last week | Edit',
    timestamp: 'Last week',
    duration: '00m 12s',
    category: 'edit',
    aspectRatio: 1.0,
    imageUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&auto=format&fit=crop&q=80',
    prompt: 'Floating ballerina in voluminous pastel pink organza gown against dark atmospheric void',
    modelId: 'fal-ai/nano-banana-pro/edit',
    modelName: 'Nano Banana Pro Edit',
    presetId: 'none-image',
    credits: 20,
    tags: ['#PhotoEdit', '#NanoBanana'],
    author: {
      name: 'Lee',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'underwater-glow',
    title: 'Aquamarine Dream',
    subtitle: 'Oct 28 | 00m 20s',
    timestamp: 'Oct 28',
    duration: '00m 20s',
    category: 'loops',
    aspectRatio: 0.8,
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    prompt: 'Free diver submerged in crystal turquoise water with refractive sun rays illuminating water drops, seamless loop',
    modelId: 'alibaba/wan-3.0/text-to-video',
    modelName: 'Wan 3',
    presetId: 'orbit',
    credits: 45,
    tags: ['#Underwater', '#Wan3'],
    author: {
      name: 'Space Tom',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    },
    filmstrip: FILMSTRIP_FRAMES,
  },
];
