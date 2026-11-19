import type { CreateMode } from './catalog';

/** Accent colors per creation mode — used on the Home feed's chips and tiles. */
export const MODE_COLORS: Record<CreateMode | 'all', { bg: string; text: string }> = {
  all: { bg: '#C6FF3D', text: '#0B0B0F' },
  video: { bg: '#8B5CF6', text: '#FFFFFF' },
  image: { bg: '#22D3EE', text: '#0B0B0F' },
  edit: { bg: '#FF4D8D', text: '#FFFFFF' },
};

export const HERO_GRADIENT = ['#C6FF3D', '#22D3EE', '#8B5CF6', '#FF4D8D'] as const;

export const MODE_LABELS: Record<CreateMode | 'all', string> = {
  all: 'For you',
  video: 'Video',
  image: 'Image',
  edit: 'Photo edit',
};
