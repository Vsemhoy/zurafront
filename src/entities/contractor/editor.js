export const abilityLabels = {
  'specifier.view': 'Смотреть спецификации',
  'specifier.create': 'Создавать спецификации',
  'specifier.update': 'Редактировать спецификации и назначенные пункты',
  'specifier.delete': 'Удалять спецификации',
  'specifier.approve': 'Согласовывать спецификации и принимать требования',
  'fact.view': 'Смотреть доступные факты',
  'fact.write': 'Создавать и редактировать факты',
  'fact.reveal': 'Раскрывать чувствительные значения фактов',
  'contact.view': 'Смотреть доступные контакты',
  'contact.write': 'Создавать и редактировать контакты',
  'contractor.manage': 'Управлять Contractor',
  'contractor.delete': 'Удалять контракторов',
  'agent.manage_own': 'Управлять своими агентами',
  'task.view': 'Смотреть задачи',
  'task.create': 'Создавать задачи',
  'task.update': 'Изменять задачи',
  'task.delete': 'Удалять задачи',
  'task.assign': 'Назначать исполнителей',
  'project.delete': 'Удалять проекты',
  'book.view': 'Смотреть Booker',
  'book.create': 'Создавать книги',
  'book.update': 'Редактировать Booker',
  'book.delete': 'Удалять книги',
  'report.view': 'Смотреть отчёты',
  'report.write': 'Писать отчёты',
  'equip.view': 'Смотреть Equip',
  'equip.create': 'Регистрировать оборудование',
  'equip.update': 'Редактировать карточки Equip и вложения',
  'equip.assign': 'Выдавать, передавать и возвращать оборудование с составом',
  'equip.compose': 'Управлять контейнерами и комплектацией Equip',
  'equip.state': 'Менять состояние оборудования (с правом редактирования)',
  'equip.ownership': 'Менять собственника (с правом редактирования)',
  'equip.types': 'Создавать типы оборудования',
  'equip.access_all': 'Доступ Equip ко всем отделам, включая оборудование без отдела',
  'ledger.view': 'Смотреть Ledger в доступных проектах',
  'ledger.write': 'Создавать и изменять денежные операции Ledger',
  'ledger.manage': 'Управлять счетами, категориями и корзиной Ledger',
};
export const rolePresets = {
  owner: Object.keys(abilityLabels),
  admin: Object.keys(abilityLabels),
  member: ['fact.view', 'fact.write', 'fact.reveal', 'contact.view', 'contact.write', 'equip.view', 'agent.manage_own', 'task.view', 'task.create', 'task.update', 'task.assign', 'report.view', 'report.write'],
  observer: ['fact.view', 'contact.view', 'equip.view', 'task.view', 'report.view'],
};

export function permissionsForRole(role) {
  return { allow: [...(rolePresets[role] ?? [])], deny: [] };
}

export function permissionsWithBookAccess(permissions, mode) {
  if (mode === 'none') return permissions;
  return {
    allow: [...new Set([...(permissions?.allow ?? []), 'book.view'])],
    deny: (permissions?.deny ?? []).filter((ability) => ability !== 'book.view'),
  };
}

export function explicitPermissions(contractor) {
  const deny = contractor.permissions?.deny ?? [];
  const explicit = contractor.permissions?.allow?.includes('*') ? Object.keys(abilityLabels) : (contractor.permissions?.allow ?? []);
  return {
    allow: [...new Set([...(rolePresets[contractor.role] ?? []), ...explicit])].filter((ability) => !deny.includes(ability)),
    deny,
  };
}

const moduleLabels = {
  specifier: 'Specifier · Спецификации',
  task: 'Tasker · Задачи', project: 'Projector · Проекты', book: 'Booker · Книги',
  fact: 'Factor · Факты', contact: 'Contactor · Контакты', report: 'Reporter · Отчёты',
  equip: 'Equip · Оборудование', ledger: 'Ledger · Финансы',
  contractor: 'Contractor · Пользователи', agent: 'Агенты',
};

export function groupContractorAbilities(abilities, search = '') {
  const query = search.trim().toLocaleLowerCase();
  const groups = new Map();
  for (const ability of [...new Set(abilities)]) {
    const prefix = ability.split('.')[0];
    const title = moduleLabels[prefix] ?? `Другие возможности · ${prefix}`;
    if (query && !`${title} ${abilityLabels[ability] ?? ''} ${ability}`.toLocaleLowerCase().includes(query)) continue;
    if (!groups.has(prefix)) groups.set(prefix, { id: prefix, title, abilities: [] });
    groups.get(prefix).abilities.push(ability);
  }
  return [...groups.values()];
}

export function setContractorAbility(permissions, ability, value, abilities) {
  const known = [...new Set([...abilities, ...permissions.allow, ...permissions.deny].filter((item) => item !== '*'))];
  const expand = (list) => list.includes('*') ? known : list;
  const allow = expand(permissions.allow).filter((item) => item !== ability);
  const deny = expand(permissions.deny).filter((item) => item !== ability);
  return { allow: value === 'allow' ? [...allow, ability] : allow, deny: value === 'deny' ? [...deny, ability] : deny };
}

export function contractorDraft(contractor) {
  return {
    name: contractor.name, position: contractor.position ?? '',
    preferred_language: contractor.preferred_language ?? 'ru',
    status: contractor.status, email: contractor.email ?? '', username: contractor.username ?? '',
    role: contractor.role, project_access_mode: contractor.project_access_mode,
    book_access_mode: contractor.book_access_mode ?? 'none',
    project_ids: contractor.projects.map((project) => project.id),
    permissions: explicitPermissions(contractor), can_act_as: Boolean(contractor.can_act_as),
  };
}

const profileFields = ['name', 'position', 'preferred_language', 'status', 'email', 'username'];
export function contractorProfileChanges(draft, baseline) {
  return Object.fromEntries(profileFields.filter((key) => draft[key] !== baseline[key])
    .map((key) => [key, ['position', 'email', 'username'].includes(key) ? draft[key] || null : draft[key]]));
}

export function contractorAccessPayload(draft) {
  return {
    role: draft.role, project_access_mode: draft.project_access_mode, book_access_mode: draft.book_access_mode,
    project_ids: draft.project_ids, permissions: permissionsWithBookAccess(draft.permissions, draft.book_access_mode),
    can_act_as: draft.can_act_as,
  };
}

export function contractorAccessKey(draft) {
  return JSON.stringify({
    ...contractorAccessPayload(draft), project_ids: [...draft.project_ids].sort(),
    permissions: { allow: [...draft.permissions.allow].sort(), deny: [...draft.permissions.deny].sort() },
  });
}

// Profile-only edits must never rewrite ACL. Keep both endpoints' existing contracts.
export async function saveContractorDraft(api, scopeId, contractorId, draft, baseline) {
  const profile = contractorProfileChanges(draft, baseline);
  let result;
  if (Object.keys(profile).length) result = await api.update(scopeId, contractorId, profile);
  if (contractorAccessKey(draft) !== contractorAccessKey(baseline)) {
    try { result = await api.updateAccess(scopeId, contractorId, contractorAccessPayload(draft)); }
    catch (error) {
      if (result) throw new Error(`Профиль сохранён, но доступы не сохранены. Повторите сохранение: ${error.message}`);
      throw error;
    }
  }
  return result ? contractorDraft(result) : draft;
}
