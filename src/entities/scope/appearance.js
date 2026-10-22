export const defaultHeaderTheme = Object.freeze({ mode: 'solid', start_color: '#ffffff', end_color: '#e2e8f0', start_opacity: 88, end_opacity: 88, angle: 110 });
export const headerThemePresets = [
  { name: 'Нейтральная', theme: defaultHeaderTheme },
  { name: 'Лаванда', theme: { ...defaultHeaderTheme, mode: 'gradient', start_color: '#c4b5fd', end_color: '#fbcfe8', start_opacity: 80, end_opacity: 75 } },
  { name: 'Небо', theme: { ...defaultHeaderTheme, mode: 'gradient', start_color: '#7dd3fc', end_color: '#c7d2fe', start_opacity: 80, end_opacity: 80 } },
  { name: 'Мята', theme: { ...defaultHeaderTheme, mode: 'gradient', start_color: '#6ee7b7', end_color: '#bae6fd', start_opacity: 75, end_opacity: 80 } },
  { name: 'Персик', theme: { ...defaultHeaderTheme, mode: 'gradient', start_color: '#fdba74', end_color: '#fecdd3', start_opacity: 75, end_opacity: 80 } },
];

const hex = (value, fallback) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
const integer = (value, fallback, max) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : fallback;
export function normalizeHeaderTheme(value) {
  const theme = value && typeof value === 'object' ? value : {};
  return {
    mode: theme.mode === 'gradient' ? 'gradient' : 'solid',
    start_color: hex(theme.start_color, defaultHeaderTheme.start_color),
    end_color: hex(theme.end_color, defaultHeaderTheme.end_color),
    start_opacity: integer(theme.start_opacity, defaultHeaderTheme.start_opacity, 100),
    end_opacity: integer(theme.end_opacity, defaultHeaderTheme.end_opacity, 100),
    angle: integer(theme.angle, defaultHeaderTheme.angle, 360),
  };
}
const rgba = (color, opacity) => `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${opacity / 100})`;
export function headerThemeBackground(value) {
  const theme = normalizeHeaderTheme(value);
  const start = rgba(theme.start_color, theme.start_opacity);
  const end = theme.mode === 'gradient' ? rgba(theme.end_color, theme.end_opacity) : start;
  return `linear-gradient(${theme.angle}deg, ${start} 0%, ${end} 100%)`;
}
