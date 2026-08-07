// lib/styles/golplay.ts
// Tokens y base CSS de GolPlay. Importar y prefijar el CSS de cada página.
// Eventualmente mover a pages/_app.tsx para evitar duplicación.

export const GOLPLAY_BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --ink: #141a33; --ink2: #242c44; --muted: #6b7385; --faint: #aab2c4;
  --bone: #f4f6fb; --white: #ffffff; --bd: #e7ebf3; --bd2: #d7dce8;
  --g9: #0f1430; --g8: #1a2350; --g7: #26379e; --g6: #3a5bf0; --g5: #4a68f5;
  --g4: #d4f24d; --g3: #e3f77d; --g1: #e8ecff; --g0: #f4f6fb;
  --dark: #141a33; --dark2: #1a2350; --dark3: #202a5c;
  --r-sm: 10px; --r-md: 14px; --r-lg: 20px; --r-xl: 26px;
  --sh-xs: 0 1px 3px rgba(0,0,0,.05), 0 3px 10px rgba(0,0,0,.06);
  --sh-sm: 0 2px 8px rgba(0,0,0,.07), 0 8px 24px rgba(0,0,0,.07);
  --sh-md: 0 4px 16px rgba(0,0,0,.10), 0 16px 40px rgba(0,0,0,.09);
  --sh-lg: 0 8px 32px rgba(0,0,0,.14), 0 24px 64px rgba(0,0,0,.11);
  --font-d: 'Poppins', system-ui, sans-serif;
  --font-u: 'Inter', system-ui, sans-serif;
  --blue: #3a5bf0; --blue2: #2c46cf; --blue-d: #26379e;
  --lime: #d4f24d; --lime2: #c7ea38; --limeink: #1c2a0a;
  --paper: #f4f6fb; --card: #ffffff; --line: #e7ebf3; --navy: #141a33;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--font-u); background: var(--bone); color: var(--ink);
  -webkit-font-smoothing: antialiased; overflow-x: hidden;
}
::selection { background: var(--g4); color: var(--g9); }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bd2); border-radius: 99px; }

@keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes pulseDot { 0%,100%{box-shadow:0 0 0 0 rgba(58,91,240,.5)} 50%{box-shadow:0 0 0 7px rgba(58,91,240,0)} }
@keyframes popIn { from{opacity:0;transform:scale(.97) translateY(-4px)} to{opacity:1;transform:none} }
@keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }

.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 90;
  height: 62px; padding: 0 clamp(16px,4vw,40px);
  display: flex; align-items: center; justify-content: space-between;
  transition: all .3s ease;
}
.nav--transparent { background: transparent; }
.nav--scrolled {
  background: rgba(8,14,10,.93); backdrop-filter: blur(24px) saturate(1.5);
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.nav--light {
  background: rgba(242,240,235,.97); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--bd);
}
.nav__logo { display: flex; align-items: center; height: 38px; cursor: pointer; }
.nav__logo img { height: 36px; width: auto; display: block; }
.nav__links { display: flex; align-items: center; gap: 4px; }
.nav__link {
  padding: 7px 13px; border-radius: var(--r-sm);
  font-size: 13.5px; font-weight: 500; text-decoration: none; transition: all .14s;
}
.nav__link--dk { color: rgba(255,255,255,.65); }
.nav__link--dk:hover { color: #fff; background: rgba(255,255,255,.09); }
.nav__link--dk.nav__link--keep { color: #fff; font-weight: 600; border: 1px solid rgba(255,255,255,.2); border-radius: 10px; }
.nav__link--dk.nav__link--keep:hover { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.35); }
.nav__link--lt { color: var(--ink2); }
.nav__link--lt:hover { background: rgba(0,0,0,.05); }
.nav__cta {
  padding: 8px 18px; border-radius: var(--r-sm);
  font-size: 13.5px; font-weight: 700;
  background: var(--g6); color: #fff; text-decoration: none;
  box-shadow: 0 2px 10px rgba(58,91,240,.3); transition: all .14s;
}
.nav__cta:hover { background: var(--g7); transform: translateY(-1px); }
.nav__mcta {
  display: none; padding: 8px 15px; border-radius: var(--r-sm);
  font-size: 13px; font-weight: 700;
  background: var(--g6); color: #fff; text-decoration: none;
}

@media (max-width: 768px) {
  .nav__link { display: none !important; }
  .nav__link--keep { display: flex !important; }
  .nav__cta { display: flex !important; }
  .nav__mcta { display: flex !important; }
}

.eyebrow {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 10px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--g6); margin-bottom: 10px;
}
.eyebrow::before {
  content: ''; display: block; width: 16px; height: 2px;
  background: var(--g5); border-radius: 99px; flex-shrink: 0;
}
.eyebrow--lt { color: var(--g4); }
.eyebrow--lt::before { background: var(--g4); }
.h2 {
  font-family: var(--font-d);
  font-size: clamp(26px,6vw,42px);
  font-weight: 800; color: var(--ink);
  line-height: 1.0; letter-spacing: -.03em; margin: 0;
}
.h2 em { font-style: italic; color: var(--g6); }
.h2--lt { color: #fff; }
.h2--lt em { color: var(--g4); }

.sk {
  background: linear-gradient(90deg, #eef1f8 25%, #f4f6fb 50%, #eef1f8 75%);
  background-size: 400% 100%; animation: shimmer 1.6s infinite; border-radius: 8px;
}
`;