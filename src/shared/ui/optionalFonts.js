// Optional decoration must never hold the application's first render hostage.
export function loadOptionalFonts(document) {
  if (document.getElementById('zuratax-optional-fonts')) return;
  const link = document.createElement('link');
  link.id = 'zuratax-optional-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}
