import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IconChevronDown, IconPalette, IconX } from '@tabler/icons-react';
import { applyHeaderThemePreset, defaultHeaderTheme, headerThemeBackground, headerThemePresets, headerThemeStyle, maxHeaderBlur, normalizeHeaderTheme } from '../../entities/scope/appearance';
import { scopeApi } from '../../entities/scope/api';
import { EditorSaveBar } from '../../shared/ui/EditorSaveBar';
import { useSaveForm } from '../../shared/ui/useSaveForm';
import './ScopeAppearance.css';

function ThemeColor({ title, color, opacity, onChange, onOpacity }) {
  const pickerColor = /^#[\da-f]{6}$/i.test(color) ? color : '#ffffff';
  return <fieldset className="scope-theme-color"><legend>{title}</legend><label>Цвет<div className="scope-theme-color-input"><input type="color" aria-label={`${title}: палитра`} value={pickerColor} onChange={(event) => onChange(event.target.value)}/><input aria-label={`${title}: HEX`} value={color} pattern="#[0-9a-fA-F]{6}" maxLength={7} required onChange={(event) => onChange(event.target.value)} spellCheck={false}/></div></label><label>Непрозрачность, %<div className="scope-theme-opacity"><input type="range" aria-label={`${title}: непрозрачность`} min="0" max="100" value={opacity} onChange={(event) => onOpacity(Number(event.target.value))}/><input type="number" aria-label={`${title}: непрозрачность в процентах`} min="0" max="100" required value={opacity} onChange={(event) => onOpacity(event.target.value === '' ? '' : Number(event.target.value))}/></div></label></fieldset>;
}

export function ScopeAppearanceModal({ scope, onClose, onPreview }) {
  const dialog = useRef(null), formElement = useRef(null);
  const queryClient = useQueryClient();
  const form = useSaveForm({
    initial: normalizeHeaderTheme(scope.settings?.header_theme), label: `Оформление скоупа «${scope.name}»`,
    validate: () => formElement.current.reportValidity(),
    persist: async (theme) => {
      const saved = await scopeApi.updateAppearance(scope.id, normalizeHeaderTheme(theme));
      queryClient.setQueryData(['scopes'], (items = []) => items.map((item) => item.id === saved.id ? saved : item));
      return normalizeHeaderTheme(saved.settings?.header_theme);
    },
  });
  const theme = form.draft;
  const change = (key, value) => form.change((current) => ({ ...current, [key]: value }));
  const close = () => form.leave(onClose);
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  useEffect(() => { onPreview({ scopeId: scope.id, theme }); }, [scope.id, theme, onPreview]);
  useEffect(() => () => onPreview(null), [onPreview]);
  return <dialog ref={dialog} className="scope-appearance-modal" aria-labelledby="scope-appearance-title" onCancel={(event) => { event.preventDefault(); close(); }}>
    <form ref={formElement} onSubmit={(event) => { event.preventDefault(); void form.save(); }}>
      <header className="scope-theme-header"><h2 id="scope-appearance-title"><IconPalette size={18}/>Оформление скоупа</h2><button type="button" className="scope-theme-close" aria-label="Закрыть оформление" onClick={close}><IconX size={18}/></button></header>
      <p className="scope-theme-note"><strong>{scope.name}</strong> · Общая тема для всех участников. Пока меняется только хедер.</p>
      <div className="scope-theme-preview-canvas"><div className="scope-theme-preview" style={headerThemeStyle(theme)}><span className="scope-theme-preview-pill">{scope.name}<IconChevronDown size={14}/></span><small>Предпросмотр хедера</small></div></div>
      <div className="scope-theme-presets" role="group" aria-label="Пресеты оформления">{headerThemePresets.map((preset) => <button key={preset.name} type="button" style={{ backgroundImage: headerThemeBackground(preset.theme) }} aria-pressed={JSON.stringify(theme) === JSON.stringify(applyHeaderThemePreset(theme, preset.theme))} onClick={() => form.change(applyHeaderThemePreset(theme, preset.theme))}>{preset.name}</button>)}</div>
      <label className="scope-theme-mode"><input type="checkbox" checked={theme.mode === 'gradient'} onChange={(event) => change('mode', event.target.checked ? 'gradient' : 'solid')}/>Градиент <small>{theme.mode === 'gradient' ? 'Два цвета' : 'Сплошной цвет'}</small></label>
      <div className="scope-theme-colors"><ThemeColor title={theme.mode === 'gradient' ? 'Начало' : 'Заливка'} color={theme.start_color} opacity={theme.start_opacity} onChange={(value) => change('start_color', value)} onOpacity={(value) => change('start_opacity', value)}/>{theme.mode === 'gradient' && <ThemeColor title="Конец" color={theme.end_color} opacity={theme.end_opacity} onChange={(value) => change('end_color', value)} onOpacity={(value) => change('end_opacity', value)}/>}</div>
      {theme.mode === 'gradient' && <label className="scope-theme-angle">Направление, °<input type="number" min="0" max="360" required value={theme.angle} onChange={(event) => change('angle', event.target.value === '' ? '' : Number(event.target.value))}/></label>}
      <div className="scope-theme-blur"><label htmlFor="scope-theme-blur">Размытие фона, px</label><div className="scope-theme-opacity"><input id="scope-theme-blur" type="range" min="0" max={maxHeaderBlur} step="1" value={theme.blur_px === '' ? 0 : theme.blur_px} onChange={(event) => change('blur_px', Number(event.target.value))}/><input type="number" aria-label="Размытие фона в пикселях" min="0" max={maxHeaderBlur} step="1" required value={theme.blur_px} onChange={(event) => change('blur_px', event.target.value === '' ? '' : Number(event.target.value))}/></div></div>
      <div className="scope-theme-bottom"><small>0% — полностью прозрачно, 100% — непрозрачно. При непрозрачной заливке размытие фона не видно. 0 px отключает размытие.</small><button type="button" onClick={() => form.change({ ...defaultHeaderTheme })}>Сбросить к нейтральной</button></div>
      {form.error && <p className="scope-theme-error" role="alert">{form.error}</p>}
      <footer className="scope-theme-save-footer"><EditorSaveBar {...form} onSave={form.save}/></footer>
    </form>
  </dialog>;
}
