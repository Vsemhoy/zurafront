import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconArrowRight, IconHistory, IconSearch, IconX } from '@tabler/icons-react';
import { releases, changelogModules } from '../entities/changelog/releases';
import sources from '../entities/changelog/sources.json';
import { Brand } from '../shared/ui/Brand';
import './ChangelogPage.css';

const months = [...new Set(releases.map(release => release.date.slice(0, 7)))];
const dateLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const monthLabel = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

export function ChangelogPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const module = changelogModules.includes(params.get('module')) ? params.get('module') : '';
  const month = months.includes(params.get('month')) ? params.get('month') : '';
  const normalizedQuery = query.trim().toLocaleLowerCase('ru');
  const filtered = releases.flatMap(release => {
    if (month && !release.date.startsWith(month)) return [];
    const changes = release.changes.filter(([area, text]) => (!module || module === area)
      && `${release.title} ${area} ${text} ${dateLabel(release.date)}`.toLocaleLowerCase('ru').includes(normalizedQuery));
    return changes.length ? [{ ...release, changes }] : [];
  });
  const updateFilter = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'История обновлений — Zuratax';
    return () => { document.title = previousTitle; };
  }, []);

  return <div className="changelog-page">
    <a className="changelog-skip" href="#changelog-feed">К обновлениям</a>
    <header className="changelog-header">
      <Link to="/login" aria-label="Zuratax — вход"><Brand/></Link>
      <Link className="changelog-login" to="/login">В рабочее пространство <IconArrowRight size={16}/></Link>
    </header>
    <main className="changelog-main">
      <section className="changelog-intro" aria-labelledby="changelog-title">
        <p className="changelog-kicker"><IconHistory size={16}/> ЧТО НОВОГО В ZURATAX</p>
        <h1 id="changelog-title">История обновлений</h1>
        <p className="changelog-lead">Новые возможности, улучшения и исправления — от первых задач до связанного рабочего пространства.</p>
        <div className="changelog-meta"><span>Доступно без входа</span><span>Последние изменения: {dateLabel(releases[0].date)}</span></div>
      </section>
      <div className="changelog-layout">
        <aside className="changelog-sidebar" aria-label="Фильтры обновлений">
          <label className="changelog-search"><IconSearch size={17}/><input type="search" aria-label="Поиск по обновлениям" placeholder="Найти изменение…" value={query} onChange={event => updateFilter('q', event.target.value)}/></label>
          <label className="changelog-select">Модуль<select value={module} onChange={event => updateFilter('module', event.target.value)}><option value="">Все модули</option>{changelogModules.map(area => <option key={area}>{area}</option>)}</select></label>
          <nav className="changelog-months" aria-label="Период обновлений">
            <button type="button" aria-pressed={!month} onClick={() => updateFilter('month', '')}>Вся история <span>{releases.length}</span></button>
            {months.map(value => <button type="button" key={value} aria-pressed={month === value} onClick={() => updateFilter('month', value)}>{monthLabel(value)}<span>{releases.filter(release => release.date.startsWith(value)).length}</span></button>)}
          </nav>
          <p className="changelog-note">Собрано по истории фронтенда и бэкенда. Даты соответствуют изменениям в Git и могут отличаться от даты появления на сервере.</p>
        </aside>
        <section className="changelog-feed" id="changelog-feed" tabIndex={-1} aria-label="Лента обновлений">
          <div className="changelog-results"><span role="status">Дней с обновлениями: {filtered.length}</span>{(query || module || month) && <button type="button" onClick={() => setParams({}, { replace: true })}><IconX size={14}/> Сбросить фильтры</button>}</div>
          {filtered.length === 0 && <div className="changelog-empty"><h2>Ничего не найдено</h2><p>Попробуйте другое слово, модуль или период.</p></div>}
          {filtered.map((release, index) => <article className="changelog-entry" key={release.date} id={`update-${release.date}`}>
            <div className="changelog-entry-date"><a href={`#update-${release.date}`} aria-label={`Ссылка на обновления за ${dateLabel(release.date)}`}><time dateTime={release.date}>{dateLabel(release.date)}</time></a>{release.date === releases[0].date && <span>Последнее</span>}</div>
            <h2>{release.title}</h2>
            <ul>{release.changes.map(([area, text], changeIndex) => <li key={`${area}-${changeIndex}`}><button className="changelog-tag" type="button" onClick={() => updateFilter('module', area)} aria-label={`Показать обновления модуля ${area}`}>{area}</button><p>{text}</p></li>)}</ul>
            <details className="changelog-sources"><summary>Изменения в Git · {sources[release.date]?.length || 0}</summary><div>{(sources[release.date] || []).map(({ repo, hash }) => <a key={`${repo}-${hash}`} href={`https://github.com/Vsemhoy/${repo}/commit/${hash}`} target="_blank" rel="noreferrer">{repo === 'zurafront' ? 'Фронт' : 'Бэк'} <code>{hash}</code> ↗</a>)}</div></details>
            {index === filtered.length - 1 && !query && !module && !month && <p className="changelog-start">С этого всё началось.</p>}
          </article>)}
        </section>
      </div>
    </main>
    <footer className="changelog-footer"><span>Zuratax · История развития продукта</span><a href="#changelog-title">Наверх ↑</a></footer>
  </div>;
}
