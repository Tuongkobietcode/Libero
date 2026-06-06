export interface BookVisual {
  bg: string;
  text: string;
  spine: string;
  accent: string;
}

export const DEFAULT_BOOK_COVER_IMAGE = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400&auto=format&fit=crop';

const bookCoverPalette: BookVisual[] = [
  { bg: '#10384f', text: '#edf8ff', spine: '#072434', accent: '#f4b860' },
  { bg: '#b85c4a', text: '#fff8ed', spine: '#783326', accent: '#f5d09b' },
  { bg: '#12263a', text: '#f1f8ff', spine: '#081827', accent: '#79c6d8' },
  { bg: '#f2dfbd', text: '#3b250d', spine: '#c9943f', accent: '#7f4d16' },
  { bg: '#0c5669', text: '#e5fbff', spine: '#073846', accent: '#93d6df' },
  { bg: '#7ca7cf', text: '#09233c', spine: '#4e7fa8', accent: '#e8f4ff' },
  { bg: '#f5f1e8', text: '#241c13', spine: '#d7c8ad', accent: '#9b4b35' },
  { bg: '#0e674f', text: '#eafff7', spine: '#094532', accent: '#e2b85c' },
  { bg: '#c69a3f', text: '#251a07', spine: '#8d671f', accent: '#fff2c8' },
  { bg: '#dce9fb', text: '#17365f', spine: '#99b8e4', accent: '#315b98' },
  { bg: '#5f4b8b', text: '#fbf7ff', spine: '#3d2c62', accent: '#e7c96d' },
  { bg: '#e7d8ce', text: '#2d211a', spine: '#b99180', accent: '#486b58' },
];

function hash(input: string): number {
  let value = 0;

  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) | 0;
  }

  return Math.abs(value);
}

export function bookVisual(seed: string): BookVisual {
  const normalizedSeed = seed.trim();

  if (!normalizedSeed) {
    return bookCoverPalette[0]!;
  }

  return bookCoverPalette[hash(normalizedSeed) % bookCoverPalette.length]!;
}

export function bookInitials(title: string, max = 3): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
