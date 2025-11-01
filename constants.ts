
import { Category } from './types';

export const CATEGORY_ORDER = [
  'Murales Completos',
  'Murales Simples',
  'Detalles / Puertas / Espejos',
  'Cuadros y Relojes',
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'full-murals',
    title: 'Murales Completos',
    images: [
      { id: 'fm1', src: 'https://picsum.photos/seed/mural1/600/800', alt: 'Full calligraffiti mural in a studio' },
      { id: 'fm2', src: 'https://picsum.photos/seed/mural2/600/800', alt: 'Elaborate wall art' },
      { id: 'fm3', src: 'https://picsum.photos/seed/mural3/600/800', alt: 'Large scale calligraffiti' },
      { id: 'fm4', src: 'https://picsum.photos/seed/mural4/600/800', alt: 'Studio interior with full mural' },
      { id: 'fm5', src: 'https://picsum.photos/seed/mural5/600/800', alt: 'Artistic mural design' },
    ],
  },
  {
    id: 'simple-murals',
    title: 'Murales Simples',
    images: [
      { id: 'sm1', src: 'https://picsum.photos/seed/simple1/600/800', alt: 'Simple calligraffiti accent wall' },
      { id: 'sm2', src: 'https://picsum.photos/seed/simple2/600/800', alt: 'Minimalist wall art' },
      { id: 'sm3', src: 'https://picsum.photos/seed/simple3/600/800', alt: 'Clean calligraffiti design' },
      { id: 'sm4', src: 'https://picsum.photos/seed/simple4/600/800', alt: 'Subtle mural piece' },
    ],
  },
  {
    id: 'details',
    title: 'Detalles / Puertas / Espejos',
    images: [
      { id: 'd1', src: 'https://picsum.photos/seed/detail1/600/800', alt: 'Calligraffiti on a studio door' },
      { id: 'd2', src: 'https://picsum.photos/seed/detail2/600/800', alt: 'Etched mirror with calligraffiti' },
      { id: 'd3', src: 'https://picsum.photos/seed/detail3/600/800', alt: 'Detail work on furniture' },
      { id: 'd4', src: 'https://picsum.photos/seed/detail4/600/800', alt: 'Calligraffiti on a window' },
      { id: 'd5', src: 'https://picsum.photos/seed/detail5/600/800', alt: 'Small accent details' },
    ],
  },
  {
    id: 'paintings-clocks',
    title: 'Cuadros y Relojes',
    images: [
      { id: 'p1', src: 'https://picsum.photos/seed/painting1/600/800', alt: 'Framed calligraffiti artwork' },
      { id: 'p2', src: 'https://picsum.photos/seed/painting2/600/800', alt: 'Canvas with calligraffiti' },
      { id: 'p3', src: 'https://picsum.photos/seed/painting3/600/800', alt: 'Set of framed pieces' },
      { id: 'c1', src: 'https://picsum.photos/seed/clock1/600/800', alt: 'Custom calligraffiti wall clock' },
      { id: 'c2', src: 'https://picsum.photos/seed/clock2/600/800', alt: 'Artistic clock design' },
    ],
  },
];
