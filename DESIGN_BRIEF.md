# El Guru — Visual Direction v2

## Creative direction
El Guru should feel like a premium digital product, not an AI template and not a generic esoteric website.

Reference principles:
- Apple-like storytelling: large editorial typography, whitespace, progressive disclosure, scroll-driven motion.
- No glassmorphism overload, no neon gradients, no stock AI imagery, no dashboard-first hero.
- Dark, atmospheric, warm and intelligent.
- Motion must communicate hierarchy, not decoration.
- Mobile-first and fast.

## Brand
Working brand: EL GURU
Personality: mysterious, calm, premium, human, insightful.
Voice: concise, intimate, confident.
Avoid: "revolutionary AI", robot imagery, excessive stars, purple-on-black SaaS clichés.

## Color system
Keep the existing dark/purple/gold direction as the base:
- Obsidian: #0A0910
- Deep violet: #24153F
- Guru violet: #7657E8
- Warm gold: #D8B66A
- Ivory: #F4F0E8
- Muted text: #A7A0B5

Colors are tokens, so they can be swapped to match the production site's exact palette without rewriting components.

## Typography
The wordmark is a custom SVG treatment rather than a generic web font.
UI typography uses a system-first stack for speed:
SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif.
Editorial accent uses Georgia/serif fallback only where it adds contrast.

## Homepage story
1. Hero: "O que o céu diz sobre você?" with a living orbital mark.
2. Scroll transition: the orbit expands into a personal universe.
3. Product reveal: Astrology → Tarot → Numerology → Relationships.
4. Guru AI section: the interface appears progressively as the user scrolls.
5. Personalization: birth data becomes the visual input for the experience.
6. Premium conversion: understated, editorial, no aggressive pricing wall.
7. Final CTA: "Conheça o seu mapa."

## Motion
- CSS transforms/opacity only where possible.
- IntersectionObserver for reveal.
- requestAnimationFrame for scroll progress.
- Respect prefers-reduced-motion.
- No heavy animation libraries for the landing page.

## Performance
- No video in the first viewport.
- Inline SVG for the brand mark.
- System fonts.
- Lazy-load non-critical media.
- Avoid background filters and expensive blur effects.
