import { svgDataToText } from './model.js';

// draw.io rewrites envelope metadata on export, even when the drawing has not changed.
export const diagramSourceKey = (xml) => xml.replace(/<mxfile\b[^>]*>/, (tag) => tag.replace(/\s(?:modified|agent|etag|version|host)=(?:"[^"]*"|'[^']*')/g, ''));

export function createDiagramEditorSession({ diagram, post, persist, onChange, onSaved, onClose, onRequestClose, schedule = setTimeout, cancel = clearTimeout }) {
  let xml = diagram.xml;
  let savedKey = diagramSourceKey(xml);
  let savedXml = xml;
  let waiters = [];
  const settle = (success) => { const pending = waiters; waiters = []; pending.forEach((resolve) => resolve(success)); };
  let revision = diagram.revision;
  let sequence = 0;
  let requestId = 0;
  let ready = false;
  let busy = false;
  let disposed = false;
  let exportJob = null;
  let timeout;
  let queued = false;
  let queuedExit = false;
  let savedCount = 0;
  const dirty = () => diagramSourceKey(xml) !== savedKey;
  const emit = (phase, status, error = '') => {
    if (!disposed) onChange({ phase, status, error, busy, ready, dirty: dirty(), savedCount });
  };
  const stopBusy = () => { busy = false; cancel(timeout); };
  const fail = (failure) => {
    requestId++;
    exportJob = null; queued = false; queuedExit = false; stopBusy();
    emit('error', 'Не сохранено. Повторите сохранение или скачайте XML.', failure.message);
    post({ action: 'spinner', show: false });
    settle(false);
  };
  const updateDraft = (value) => {
    if (value !== xml) { xml = value; sequence++; }
    if (!busy) emit(dirty() ? 'dirty' : 'ready', dirty() ? 'Есть изменения · Ctrl+S, чтобы сохранить версию' : `Все изменения сохранены · версия ${revision}`);
  };
  const finish = (job) => {
    stopBusy();
    savedCount++;
    emit(dirty() ? 'dirty' : 'saved', dirty() ? 'Версия сохранена · есть новые изменения' : `Сохранено · версия ${revision}`);
    if (!dirty()) post({ action: 'status', message: 'Сохранено', modified: false });
    const exit = job.exit || queuedExit;
    const again = queued || (exit && dirty());
    queued = false; queuedExit = false;
    if (exit && !dirty()) onClose();
    else if (again) save(exit);
    if (!again) settle(!dirty());
  };
  const requestClose = () => {
    if (disposed || busy) return;
    if (!ready) { (onRequestClose || onClose)(); return; }
    busy = true;
    exportJob = { id: ++requestId, sequence, inspect: true };
    emit('checking', 'Проверяю изменения перед выходом…');
    timeout = schedule(() => fail(new Error('Не удалось проверить изменения. Повторите попытку или скачайте XML.')), 30000);
    post({ action: 'export', format: 'xml', requestId: exportJob.id });
  };
  const save = (exit = false) => {
    if (disposed) return;
    if (!ready) { if (exit && !dirty()) onClose(); return; }
    if (busy) { queued = true; queuedExit ||= exit; return; }
    busy = true;
    exportJob = { id: ++requestId, sequence, exit };
    emit('saving', exit ? 'Сохраняю и закрываю…' : 'Сохраняю схему…');
    timeout = schedule(() => fail(new Error('Редактор не вернул схему вовремя. Попробуйте сохранить ещё раз или скачайте XML.')), 30000);
    // The echoed ID prevents a late export from an earlier attempt replacing a newer draft.
    post({ action: 'export', format: 'svg', embedImages: true, theme: 'light', spinKey: 'saving', requestId: exportJob.id });
  };
  const receive = async (message) => {
    if (disposed) return;
    if (message.event === 'configure') {
      // Change notifications and SVG exports must serialize pages in the same format.
      post({ action: 'configure', config: { compressXml: true } });
    } else if (message.event === 'init') {
      // autosave here is only the change-notification protocol, not a server write.
      post({ action: 'load', xml, title: diagram.title, autosave: 1 });
    } else if (message.event === 'load') {
      if (ready || busy) return;
      busy = true;
      exportJob = { id: ++requestId, sequence, baseline: true };
      emit('loading', 'Подготавливаю схему…');
      timeout = schedule(() => fail(new Error('Редактор не вернул исходник после загрузки. Закройте редактор и попробуйте ещё раз.')), 30000);
      // Establish a normalized baseline before enabling interactions: importing XML alone is not an edit.
      post({ action: 'export', format: 'xml', requestId: exportJob.id });
    } else if ((message.event === 'autosave' || message.event === 'save') && typeof message.xml === 'string') {
      updateDraft(message.xml);
      if (message.event === 'save') save();
    } else if (message.event === 'exit') { if (onRequestClose) requestClose(); else save(true); }
    else if (message.event === 'export' && exportJob) {
      let echo = message.message;
      if (typeof echo === 'string') { try { echo = JSON.parse(echo); } catch { return; } }
      if (echo?.requestId !== exportJob.id) return;
      const job = exportJob; exportJob = null; cancel(timeout);
      try {
        if (typeof message.xml !== 'string' || !message.xml.trim()) throw new Error('Редактор не вернул исходник. Существующая схема не изменена.');
        const exportedXml = message.xml;
        if (job.baseline) {
          if (sequence !== job.sequence) throw new Error('Схема изменилась во время запуска. Скачайте XML и откройте редактор заново.');
          xml = exportedXml; savedXml = xml; savedKey = diagramSourceKey(xml); ready = true; stopBusy();
          emit('ready', 'Ctrl+S — сохранить версию, не закрывая редактор');
          return;
        }
        if (sequence === job.sequence) xml = exportedXml;
        if (job.inspect) {
          stopBusy();
          emit(dirty() ? 'dirty' : 'ready', dirty() ? 'Есть несохранённые изменения' : 'Все изменения сохранены');
          (onRequestClose || onClose)();
          return;
        }
        if (diagramSourceKey(exportedXml) !== savedKey) {
          const preview_svg = svgDataToText(message.data);
          const result = await persist({ revision, xml: exportedXml, preview_svg });
          if (disposed || job.id !== requestId) return;
          revision = result.revision;
          savedKey = diagramSourceKey(exportedXml);
          savedXml = exportedXml;
          onSaved(result);
        }
        finish(job);
      } catch (failure) { if (!disposed) fail(failure); }
    } else if (message.event === 'error') fail(new Error(message.message || 'Ошибка редактора схемы.'));
  };
  return {
    receive,
    save: () => save(),
    close: () => save(true),
    requestClose,
    saveAndWait() { if (disposed || !ready) return Promise.resolve(false); return new Promise((resolve) => { waiters.push(resolve); save(); }); },
    discard() { if (!busy) { xml = savedXml; emit('ready', 'Изменения отменены'); } },
    get xml() { return xml; },
    get unsaved() { return busy || dirty(); },
    get dirty() { return dirty(); },
    get busy() { return busy; },
    dispose() { disposed = true; cancel(timeout); settle(false); },
  };
}
