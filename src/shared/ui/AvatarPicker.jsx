import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api';
import { AvatarImage } from './AvatarImage';
import { PhotoPanel } from './PhotoPanel';

const centered = { x: 50, y: 50, zoom: 1 };

export function AvatarPicker({ scopeId, contractor, onChanged }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('presets');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef(null);
  const panel = useRef(null);
  const drag = useRef(null);
  const presets = useQuery({ queryKey: ['avatar-presets', scopeId], queryFn: () => apiRequest(`/scopes/${scopeId}/avatars`), enabled: open });
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const start = () => { setDraft(contractor.profile?.avatar ?? null); setError(''); setOpen(true); };
  const choose = (avatar) => setDraft({ ...avatar, crop: { ...centered } });
  const crop = draft?.crop ?? centered;
  const adjust = (key, value) => setDraft((current) => ({ ...current, crop: { ...centered, ...current?.crop, [key]: Number(value) } }));
  const save = async () => {
    setBusy(true); setError('');
    try {
      const avatar = draft ? { ...(draft.preset ? { preset: draft.preset } : { file_id: draft.file_id }), crop } : null;
      await apiRequest(`/scopes/${scopeId}/contractors/${contractor.id}/avatar`, { method: 'PATCH', body: JSON.stringify({ avatar }) });
      await onChanged(); close();
    } catch (failure) { setError(failure.message || 'Не удалось сохранить аватар. Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  };
  return <div className="avatar-picker">
    <AvatarImage avatar={contractor.profile?.avatar} name={contractor.name}/>
    <div><strong>Аватар пользователя</strong><p>{contractor.can_change_avatar ? 'Выберите персонажа или загрузите своё фото.' : 'Изменить может пользователь или владелец скоупа.'}</p>
      {contractor.can_change_avatar && <button type="button" ref={trigger} onClick={start}>Выбрать аватар</button>}
    </div>
    {open && <div className="avatar-picker-panel" ref={panel} tabIndex={-1} role="region" aria-label="Выбор и кадрирование аватара" onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); close(); } }}>
      <div className="avatar-picker-heading"><strong>Выбор аватара</strong><button type="button" disabled={busy} onClick={close} aria-label="Закрыть выбор аватара">×</button></div>
      <fieldset disabled={busy}>
        <div className="avatar-crop-layout">
          <div className="avatar-crop-preview" onPointerDown={(event) => { if (!draft || busy) return; drag.current = { x: event.clientX, y: event.clientY, crop }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => {
            if (!drag.current) return;
            const start = drag.current;
            setDraft((current) => ({ ...current, crop: { ...start.crop, x: Math.max(0, Math.min(100, start.crop.x - (event.clientX - start.x) / 2)), y: Math.max(0, Math.min(100, start.crop.y - (event.clientY - start.y) / 2)) } }));
          }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            <AvatarImage avatar={draft} name={contractor.name}/>
          </div>
          <div className="avatar-crop-controls">
            <label>Масштаб<input type="range" min="1" max="3" step="0.05" value={crop.zoom} disabled={!draft} onChange={(event) => adjust('zoom', event.target.value)}/></label>
            <label>По горизонтали<input type="range" min="0" max="100" value={crop.x} disabled={!draft} onChange={(event) => adjust('x', event.target.value)}/></label>
            <label>По вертикали<input type="range" min="0" max="100" value={crop.y} disabled={!draft} onChange={(event) => adjust('y', event.target.value)}/></label>
            <button type="button" disabled={!draft} onClick={() => setDraft({ ...draft, crop: { ...centered } })}>Сбросить кадр</button>
            <small>Перетащите изображение или используйте ползунки. Кадрирование не изменяет выбранную картинку.</small>
          </div>
        </div>
        <div className="avatar-source-tabs"><button type="button" aria-pressed={source === 'presets'} onClick={() => setSource('presets')}>Коллекция</button><button type="button" aria-pressed={source === 'photos'} onClick={() => setSource('photos')}>Мои фото</button><button type="button" onClick={() => setDraft(null)}>Без аватара</button></div>
        {source === 'presets' ? <>
          {presets.isPending && <p>Загружаю коллекцию…</p>}
          {presets.error && <p role="alert">{presets.error.message || 'Не удалось загрузить коллекцию.'}<button type="button" onClick={() => presets.refetch()}>Повторить</button></p>}
          <div className="avatar-preset-grid">{presets.data?.data.map((preset, index) => <button type="button" key={preset} aria-label={`Аватар ${index + 1}`} aria-pressed={draft?.preset === preset} onClick={() => choose({ preset })}><img src={`/avatars/${preset}`} alt="" loading="lazy"/></button>)}</div>
        </> : <PhotoPanel scopeId={scopeId} type="user" id={contractor.id} selectedId={draft?.file_id} onSelect={(file) => choose({ file_id: file.id, scope_id: scopeId })}/>}
      </fieldset>
      {error && <p role="alert" className="contractor-error">{error}</p>}
      <footer><button type="button" disabled={busy} onClick={close}>Отмена</button><button type="button" disabled={busy} onClick={save}>{busy ? 'Сохраняю…' : 'Сохранить аватар'}</button></footer>
    </div>}
  </div>;
}
