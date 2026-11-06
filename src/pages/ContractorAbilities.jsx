import { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { abilityLabels, groupContractorAbilities } from '../entities/contractor/editor';

export function ContractorAbilities({ abilities, permissions, onChange, bookMode, onBookModeChange }) {
  const [search, setSearch] = useState('');
  const groups = groupContractorAbilities(abilities, search);
  return <div className="contractor-module-access">
    <div className="contractor-permission-heading"><h3>Возможности по модулям</h3><label className="contractor-permission-search"><IconSearch size={16}/><input aria-label="Поиск разрешений" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Модуль, действие или код…"/></label></div>
    <div className="contractor-permission-groups">{groups.map((group) => {
      const denied = group.abilities.filter((ability) => permissions.deny.includes('*') || permissions.deny.includes(ability)).length;
      const allowed = group.abilities.filter((ability) => !permissions.deny.includes('*') && !permissions.deny.includes(ability) && (permissions.allow.includes('*') || permissions.allow.includes(ability))).length;
      return <details key={group.id} className="contractor-permission-group" open>
        <summary><strong>{group.title}</strong><span><small>Разрешено: {allowed}</small>{denied > 0 && <small className="contractor-denied-count">Запрещено: {denied}</small>}<small>По роли: {group.abilities.length - allowed - denied}</small></span></summary>
        {group.id === 'book' && <label className="contractor-book-access">Область чтения Booker<select aria-label="Область чтения Booker" value={bookMode} onChange={(event) => onBookModeChange(event.target.value)}><option value="none">Запретить</option><option value="projects">Книги доступных проектов</option><option value="all">Все доступные книги скоупа</option></select><small>Приватные книги не открываются этой настройкой. Создание и изменение задаются ниже.</small></label>}
        <div className="contractor-abilities">{group.abilities.map((ability) => {
          const value = permissions.deny.includes('*') || permissions.deny.includes(ability) ? 'deny' : permissions.allow.includes('*') || permissions.allow.includes(ability) ? 'allow' : 'inherit';
          return <label key={ability} data-permission={value}><span>{abilityLabels[ability] ?? ability}<code>{ability}</code></span><select aria-label={`${abilityLabels[ability] ?? ability} (${ability})`} value={value} onChange={(event) => onChange(ability, event.target.value)}><option value="inherit">По роли</option><option value="allow">Разрешить</option><option value="deny">Запретить</option></select></label>;
        })}</div>
      </details>;
    })}</div>
    {!groups.length && <p className="contractor-hint">Подходящих разрешений нет.</p>}
    <p className="contractor-hint">«По роли» — наследование, а не запрет. Итоговый доступ проверяет сервер. Владелец скоупа сохраняет свои полномочия.</p>
  </div>;
}
