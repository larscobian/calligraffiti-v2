# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Calligraffiti v2 is a React 19 + TypeScript portfolio catalog application built with Vite. It features a sophisticated horizontal carousel gallery system with 3D effects, full-screen image viewer, and an admin panel for portfolio generation. The app is entirely Spanish-language.

**IMPORTANT - Project Purpose:**
- This is NOT a website for SEO or public traffic
- This is a professional landing page to send to leads/potential clients when sending proposals
- PRIMARY GOAL: Impress potential clients with professional presentation and proper image display
- The user experience must be polished, professional, and work flawlessly across desktop, tablet, and mobile
- All changes must prioritize UX quality and professional appearance

**Deployment:**
- Repository: `calligraffiti-v2` on GitHub
- Hosting: Vercel
- Always deploy to GitHub after completing changes

**Communication:**
- All responses and documentation must be in Spanish when working on this project

**Testing Requirements:**
- **CRITICAL**: ALL changes must be tested on desktop, tablet, AND mobile devices before considering them complete
- Changes that work on one device often fail on others due to different rendering engines and CSS support
- Always verify:
  - Desktop (>1024px): Full 3D effects, perspective transforms, smooth animations
  - Tablet (768px-1024px): Intermediate effects without heavy 3D transforms
  - Mobile (<768px): Simplified effects optimized for performance
- **Code Review Approach**:
  - Review code changes to ensure they include responsive breakpoints and device-specific logic
  - Check for proper use of `deviceType` state and conditional rendering/styling
  - Verify CSS media queries and conditional transforms are present
  - **Only use Playwright MCP for testing when explicitly requested or truly necessary** (consumes significant context)
  - Manual testing with browser developer tools is preferred for most changes
- Common issues: transforms working on desktop but not mobile, touch events vs click events, viewport-specific CSS

## Development Commands

```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Install dependencies
npm install
```

## Architecture Overview

### State Management
- **No external state library** - Uses React hooks exclusively
- All state centralized in `App.tsx` (363 lines)
- URL-based routing: `?admin=true` toggles admin panel
- Browser history integration for modal and category view navigation

### Core Data Model
```typescript
interface Image {
  id: string;
  src: string;
  alt: string;
  rotation?: number;
  crop?: { x, y, width, height };
}

interface Category {
  id: string;
  title: string;
  images: Image[];
}
```

Data loaded from `/public/portfolio.json` and sorted by `CATEGORY_ORDER` in `constants.ts`.

### Component Architecture

**App.tsx** - Central orchestrator with two modes:
- Public mode: Shows all categories with carousels + category grid view
- Admin mode: Portfolio generator tool using File System Access API

**Key Components:**
- `ImageGallery.tsx` (490 lines) - Horizontal carousel with infinite scroll, 3D perspective transforms, snap-to-center behavior
- `CategoryGridView.tsx` - Responsive grid (2-5 columns) for viewing full category
- `Modal.tsx` (316 lines) - Full-screen lightbox with zoom, pan, swipe navigation, keyboard controls
- `AdminPanel` (inline in App.tsx) - Scans local directories, generates portfolio.json

**Unused/Incomplete:**
- `EditModal.tsx` - Image rotation/crop UI (partial implementation)
- `Header.tsx`, `Footer.tsx` - Empty placeholder files

### View Modes

**Main View:** All categories displayed as horizontal carousels
- Click image → Opens Modal
- Click "Ver todo" → Switches to CategoryGridView

**Category View:** Full grid of single category
- Click image → Opens Modal
- Click back button (or browser back) → Returns to main view with scroll position restored

**Modal View:** Full-screen image viewer
- Swipe/arrows to navigate
- Double-tap/click to zoom 2x
- Pan when zoomed
- ESC or backdrop click to close

## Critical Implementation Details

### Carousel Behavior (ImageGallery.tsx)
- **Infinite scrolling**: Clones images at edges, seamlessly jumps when reaching boundaries
- **Active tracking**: Uses scroll position to determine center item, updates z-index dynamically
- **Platform-specific effects**:
  - Desktop: Full 3D perspective rotations (`rotateY`)
  - Mobile: Simplified scale/opacity (no rotateY for performance)
- **Smooth navigation**: `requestAnimationFrame` for scroll effect calculations
- **Snap-to-center**: Programmatic scrolling to center nearest item

### Category Ordering
Categories are sorted according to `CATEGORY_ORDER` in `constants.ts`:
```typescript
const CATEGORY_ORDER = [
  'Murales Completos',
  'Murales Simples',
  'Detalles / Puertas / Espejos',
  'Cuadros y Relojes',
];
```
Unlisted categories appear alphabetically after listed ones.

### Scroll Position Persistence
Uses `useRef<number>` to save scroll position when navigating to category view:
```typescript
savedScrollPosition.current = window.scrollY;
// Later restored with:
window.scrollTo(0, savedScrollPosition.current);
```

### Admin Panel & Portfolio Generation
- Requires Chrome/Edge/Opera (File System Access API)
- Scans nested directories for images (.jpg, .jpeg, .png, .gif, .webp)
- Generates downloadable `portfolio.json` matching the data model
- Uses `sanitizeForUrl()` to create clean file paths

### Performance Optimizations
- `lazy` loading on all images
- `requestAnimationFrame` for animations
- Debounced resize handlers
- `useCallback`/`useMemo` to prevent re-renders
- Mobile CSS: simplified transforms via `@media (max-width: 767px)`
- `will-change` CSS hints on gallery items

## Project Structure

```
src/
├── App.tsx              # Main component with admin/public mode logic
├── index.tsx           # React mount point
├── types.ts            # TypeScript interfaces
├── constants.ts        # CATEGORY_ORDER array
└── components/
    ├── ImageGallery.tsx      # Horizontal carousel
    ├── CategoryGridView.tsx  # Grid detail view
    ├── Modal.tsx             # Lightbox viewer
    ├── ConfirmationModal.tsx # Reusable dialog
    ├── ApiSettingsModal.tsx  # (Unused) API config
    ├── EditModal.tsx         # (Incomplete) Image editor
    └── icons.tsx             # SVG icon library

public/
├── portfolio.json      # Gallery data
└── images/            # Image directories

Configuration:
├── vite.config.ts     # Path alias: @/ → root
├── tsconfig.json      # ES2022 target
└── package.json       # React 19.2, Vite 6.2
```

## Styling Approach

- **Tailwind CSS** loaded via CDN in `index.html`
- **Custom CSS** in `index.html` for scrollbar hiding, perspective effects
- **Dark theme**: gray-900, gray-800 backgrounds
- **Accent colors**: purple-600/500, fuchsia-500, violet-600
- **Typography**: Bold headers with gradient text

## Important Constraints

1. **Spanish language**: All UI text must be in Spanish
2. **No external routing**: Simple URL params only
3. **Browser API limitations**: Admin panel requires Chromium-based browser
4. **Static data source**: Changes to portfolio require rebuilding or replacing `portfolio.json`
5. **Mobile-first**: Always consider mobile performance when adding effects

## Common Tasks

### Adding a New Category
1. Add category name to `CATEGORY_ORDER` in `constants.ts` (if ordering matters)
2. Update `portfolio.json` with new category object
3. Place images in appropriate `/public/images/` subdirectory

### Modifying Carousel Effects
All transform calculations in `ImageGallery.tsx`:
- `getTransformStyle()` - Main effect function
- `getZIndex()` - Layering logic
- Look for `window.innerWidth <= 767` for mobile-specific code

### Adjusting Modal Behavior
`Modal.tsx` handles:
- Touch events: `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`
- Zoom logic: `handleDoubleClick`, `handleDoubleTap`
- Navigation: `handlePrevious`, `handleNext`, `handleKeyDown`

### Debugging Scroll Issues
- Check `containerRef` in ImageGallery
- Verify `savedScrollPosition.current` in App
- Look for `overflow-hidden` classes preventing scroll
- Inspect `handlePopState` in Modal/CategoryGridView

## Technical Decisions

- **React 19.2**: Latest version with concurrent features
- **No state library**: Data model is simple enough for useState/useRef
- **Vite 6.2**: Fast dev server, optimized production builds
- **TypeScript 5.8**: Type safety with modern module resolution
- **Path aliases**: `@/` prefix keeps imports clean (configured in vite.config.ts)
