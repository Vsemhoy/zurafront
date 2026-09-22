import { AttachmentsButton } from '../shared/ui/AttachmentsButton';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { IconActivity, IconCopy, IconKey, IconPlus, IconRobot, IconSearch, IconTrash, IconUser, IconUserCog, IconUsers, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { useAuth } from '../auth';
import { contractorApi } from '../entities/contractor/api';
import { projectApi } from '../entities/project/api';
import './ContractorPage.css';
import './ContractorModalFix.css';
import './ContractorAccountTools.css';
import './ContractorTable.css';
import './ContractorAgentInstruction.css';

const typeLabels = { real: 'Реальный', virtual: 'Виртуальный', agent: 'Агент' };
const isArchivedToken = (token) => Boolean(token.revoked_at || (token.expires_at && new Date(token.expires_at).getTime() <= Date.now()));
const statusLabels = {
  active: 'Активен',
  blocked: 'Заблокирован',
  dormant: 'Спит',
};
const abilityLabels = {
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
};
const rolePresets = {
  owner: Object.keys(abilityLabels),
  admin: Object.keys(abilityLabels),
  member: ['agent.manage_own', 'task.view', 'task.create', 'task.update', 'task.assign', 'report.view', 'report.write'],
  observer: ['task.view', 'report.view'],
};

function permissionsForRole(role) {
  return { allow: [...(rolePresets[role] ?? [])], deny: [] };
}

function permissionsWithBookAccess(permissions, mode) {
  if (mode === 'none') return permissions;
  return {
    allow: [...new Set([...(permissions?.allow ?? []), 'book.view'])],
    deny: (permissions?.deny ?? []).filter((ability) => ability !== 'book.view'),
  };
}

function explicitPermissions(contractor) {
  const deny = contractor.permissions?.deny ?? [];
  const explicit = contractor.permissions?.allow?.includes('*') ? Object.keys(abilityLabels) : (contractor.permissions?.allow ?? []);
  return {
    allow: [...new Set([...(rolePresets[contractor.role] ?? []), ...explicit])].filter((ability) => !deny.includes(ability)),
    deny,
  };
}

function buildAgentInstruction(token, specification = '') {
  const baseUrl = window.location.origin;
  const specificationUrl = `${baseUrl}/api/agent/spec`;

  return `# Подключение к Zuratax Agent API

Ты работаешь как агент Zuratax. Используй этот доступ только в пределах выданных скоупов, проектов и capabilities.

Base URL: ${baseUrl}
Актуальная спецификация: GET ${specificationUrl}
Authorization: Bearer ${token}

Первым действием получи актуальную инструкцию:

curl --fail-with-body --silent --show-error \\
  -H "Authorization: Bearer ${token}" \\
  -H "Accept: text/markdown" \\
  "${specificationUrl}"

Затем проверь учётку через GET ${baseUrl}/api/agent/me и получи личную очередь через GET ${baseUrl}/api/agent/tasks.

Для JSON-запросов отправляй Accept: application/json, а для POST/PATCH ещё Content-Type: application/json. Никогда не помещай ключ в URL, код, коммиты, комментарии, логи или сообщения. При 401 считай ключ отозванным, при 403 не обходи границу доступа, при 422 исправь payload по ответу API. Актуальная спецификация по ссылке выше всегда главнее этой стартовой инструкции.

${specification ? `---\n\n# Актуальная спецификация, полученная при выпуске ключа\n\n${specification.trim()}\n` : ''}
`;
}

async function fetchAgentSpecification(token) {
  const response = await fetch(`${window.location.origin}/api/agent/spec`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/markdown',
    },
  });
  if (!response.ok) throw new Error(`Не удалось получить спецификацию агента: HTTP ${response.status}`);
  return response.text();
}

function TypeIcon({ type, size = 18 }) {
  if (type === 'agent') return <IconRobot size={size} />;
  if (type === 'virtual') return <IconUserCog size={size} />;
  return <IconUser size={size} />;
}

function agentActivityTitle(item) {
  if (item.kind === 'lore') return `${item.after?.code ?? 'Lore'} · версия ${item.after?.version ?? '—'}`;
  if (item.kind === 'api') return `${item.action.replace('agent.api.', '').toUpperCase()} ${item.context?.path ?? ''}`;
  return item.action;
}

export function ContractorPage() {
  const { activeScope } = useWorkspace();
  const currentUser = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const key = ['contractors', activeScope?.id];
  const { data: options } = useQuery({
    queryKey: ['contractor-options', activeScope?.id],
    queryFn: () => contractorApi.options(activeScope.id),
    enabled: Boolean(activeScope),
  });
  const {
    data: contractors = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: key,
    queryFn: () => contractorApi.list(activeScope.id),
    enabled: Boolean(activeScope),
  });
  const filtered = contractors.filter((item) => (type === 'all' || item.type === type) && `${item.name} ${item.email ?? ''} ${item.username ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const selectedContractor = contractors.find((item) => item.id === selectedId) ?? null;
  const counts = useMemo(() => Object.fromEntries(['real', 'virtual', 'agent'].map((item) => [item, contractors.filter((contractor) => contractor.type === item).length])), [contractors]);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({
        queryKey: ['contractors-assignable', activeScope?.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ['task-assignable', activeScope?.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ['kpi-stats', activeScope?.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard', activeScope?.id],
      }),
    ]);

  return (
    <main className="contractor-page">
      <header className="contractor-toolbar">
        <div>
          <IconUsers size={20} />
          <h1>{options?.can_manage_all === false ? 'Мои агенты' : 'Contractor'}</h1>
          <small>{contractors.length} акторов</small>
        </div>
        <label>
          <IconSearch size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти актора…" />
        </label>
        <button disabled={!options} onClick={() => setCreating(true)}>
          <IconPlus size={17} />
          {options?.can_manage_all === false ? 'Новый агент' : 'Новый актор'}
        </button>
      </header>
      <div className="contractor-layout">
        <aside className="contractor-filters">
          <strong>Типы</strong>
          {(options?.can_manage_all === false
            ? [['agent', 'Агенты', counts.agent]]
            : [
                ['all', 'Все', contractors.length],
                ['real', 'Реальные', counts.real],
                ['virtual', 'Виртуальные', counts.virtual],
                ['agent', 'Агенты', counts.agent],
              ]
          ).map(([value, label, count]) => (
            <button key={value} className={type === value || (options?.can_manage_all === false && type === 'all') ? 'active' : ''} onClick={() => setType(value)}>
              <span>{label}</span>
              <i>{count}</i>
            </button>
          ))}
        </aside>
        <section className="contractor-content">
          {!activeScope && <div className="contractor-state">Выберите скоуп.</div>}
          {isLoading && <div className="contractor-state">Загружаю акторов…</div>}
          {error && <div className="contractor-state contractor-error">{error.message}</div>}
          <div className="contractor-table">
            <div className="contractor-table-head">
              <span>Человек</span>
              <span>Тип</span>
              <span>Статус</span>
              <span>Исполнитель</span>
              <span>Проекты</span>
            </div>
            {filtered.map((contractor) => (
              <button key={contractor.id} className={`contractor-row contractor-card--${contractor.type}`} onClick={() => setSelectedId(contractor.id)}>
                <span className="contractor-person">
                  <i className="contractor-avatar">
                    <TypeIcon type={contractor.type} />
                  </i>
                  <span>
                    <strong>{contractor.name}</strong>
                    <small>{contractor.position || contractor.email || 'Без должности'}</small>
                  </span>
                </span>
                <span>{typeLabels[contractor.type]}</span>
                <span className={`contractor-status contractor-status--${contractor.status}`}>{statusLabels[contractor.status]}</span>
                <span>{contractor.is_executor ? 'Да' : '—'}</span>
                <span className="contractor-row-access">
                  {contractor.project_access_mode === 'all' ? 'Все' : contractor.project_access_mode === 'none' ? 'Нет' : contractor.projects.length}
                  {contractor.type === 'agent' && (
                    <small>
                      <IconKey size={12} />
                      {contractor.tokens?.filter((token) => !isArchivedToken(token)).length ?? 0}
                    </small>
                  )}
                </span>
              </button>
            ))}
          </div>
          {!isLoading && filtered.length === 0 && <div className="contractor-state">Никого не нашли.</div>}
        </section>
      </div>
      {creating && activeScope && (
        <ContractorCreate
          scopeId={activeScope.id}
          options={options}
          onClose={() => setCreating(false)}
          onCreated={(contractor) => {
            queryClient.setQueryData(key, (current = []) => [contractor, ...current.filter((item) => item.id !== contractor.id)]);
            refresh();
            setCreating(false);
            setSelectedId(contractor.id);
          }}
        />
      )}
      {selectedContractor && activeScope && (
        <>
          <div className="contractor-backdrop" onClick={() => setSelectedId(null)} />
          <div className="contractor-editor-stack">
            {selectedContractor.type !== 'agent' && <ContractorAccountTools scopeId={activeScope.id} contractor={selectedContractor} onChanged={refresh} />}
            <ContractorEditor key={selectedId} scopeId={activeScope.id} contractor={selectedContractor} onClose={() => setSelectedId(null)} onChanged={refresh} />
          </div>
        </>
      )}
      {selectedContractor && selectedContractor.id !== currentUser?.id && activeScope && (
        <ContractorDeleteButton
          scopeId={activeScope.id}
          contractor={selectedContractor}
          onDeleted={() => {
            setSelectedId(null);
            refresh();
          }}
        />
      )}
    </main>
  );
}

function ContractorDeleteButton({ scopeId, contractor, onDeleted }) {
  const remove = useMutation({
    mutationFn: () => contractorApi.remove(scopeId, contractor.id),
    onSuccess: onDeleted,
  });
  const confirmDelete = () => {
    if (window.confirm(`Удалить «${contractor.name}»? Аккаунт будет заблокирован, токены отозваны, назначения сняты.`)) remove.mutate();
  };
  return (
    <div className="contractor-delete">
      <button disabled={remove.isPending} onClick={confirmDelete}>
        <IconTrash size={16} />
        {remove.isPending ? 'Удаляю…' : 'Удалить контрактора'}
      </button>
      {remove.error && <small>{remove.error.message}</small>}
    </div>
  );
}

function ContractorAccountTools({ scopeId, contractor, onChanged }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [login, setLogin] = useState({
    username: contractor.username ?? '',
    email: contractor.email ?? '',
    password: '',
  });
  const saveAccess = useMutation({
    mutationFn: (bookAccessMode) =>
      contractorApi.updateAccess(scopeId, contractor.id, {
        role: contractor.role,
        project_access_mode: contractor.project_access_mode,
        book_access_mode: bookAccessMode,
        project_ids: contractor.projects.map((project) => project.id),
        permissions: permissionsWithBookAccess(contractor.permissions, bookAccessMode),
        can_act_as: contractor.can_act_as,
      }),
    onSuccess: onChanged,
  });
  const saveLogin = useMutation({
    mutationFn: () =>
      contractorApi.update(scopeId, contractor.id, {
        type: 'real',
        username: login.username || null,
        email: login.email,
        password: login.password,
      }),
    onSuccess: () => {
      setLoginOpen(false);
      setLogin((current) => ({ ...current, password: '' }));
      onChanged();
    },
  });
  const saveExecutor = useMutation({
    mutationFn: (isExecutor) => contractorApi.update(scopeId, contractor.id, { is_executor: isExecutor }),
    onSuccess: onChanged,
  });
  return (
    <>
      <div className="contractor-account-tools">
        <label>
          Доступ к Booker
          <select value={contractor.book_access_mode ?? 'none'} disabled={saveAccess.isPending} onChange={(event) => saveAccess.mutate(event.target.value)}>
            <option value="none">Запретить</option>
            <option value="projects">Только книги доступных проектов</option>
            <option value="all">Все книги скоупа</option>
          </select>
        </label>
        <label className="contractor-executor-toggle">
          <input type="checkbox" checked={contractor.is_executor} disabled={saveExecutor.isPending} onChange={(event) => saveExecutor.mutate(event.target.checked)} />
          <span>Исполнитель</span>
        </label>
        <button onClick={() => setLoginOpen(true)}>{contractor.type === 'virtual' ? 'Оживить и разрешить вход' : 'Сменить пароль'}</button>
        {(saveAccess.isPending || saveExecutor.isPending) && <small>сохраняю…</small>}
      </div>
      {loginOpen && (
        <div className="contractor-modal-backdrop contractor-login-backdrop" onMouseDown={() => setLoginOpen(false)}>
          <form
            className="contractor-modal contractor-login-modal"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              saveLogin.mutate();
            }}
          >
            <header>
              <div>
                <strong>{contractor.type === 'virtual' ? 'Оживить пользователя' : 'Новый пароль'}</strong>
                <small>{contractor.name}</small>
              </div>
              <button type="button" onClick={() => setLoginOpen(false)}>
                <IconX size={18} />
              </button>
            </header>
            {contractor.type === 'virtual' && <p className="contractor-hint">Аккаунт станет реальным пользователем и сможет входить через форму авторизации.</p>}
            <label>
              Логин
              <input value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} placeholder="Необязательно" />
            </label>
            <label>
              Email
              <input type="email" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} />
            </label>
            <label>
              {contractor.type === 'virtual' ? 'Первоначальный пароль' : 'Новый пароль'}
              <input autoFocus type="password" required minLength="8" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} />
            </label>
            {saveLogin.error && <p className="contractor-error">{saveLogin.error.message}</p>}
            <footer>
              <button type="button" onClick={() => setLoginOpen(false)}>
                Отмена
              </button>
              <button className="contractor-primary" disabled={saveLogin.isPending}>
                {saveLogin.isPending ? 'Сохраняю…' : contractor.type === 'virtual' ? 'Оживить' : 'Сменить пароль'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}

function ContractorCreate({ scopeId, options, onClose, onCreated }) {
  const canManageAll = options?.can_manage_all !== false;
  const defaultRole = canManageAll ? 'member' : 'observer';
  const [form, setForm] = useState({
    name: '',
    position: '',
    preferred_language: 'ru',
    type: canManageAll ? 'virtual' : 'agent',
    is_executor: canManageAll,
    role: defaultRole,
    project_access_mode: 'none',
    book_access_mode: 'none',
    permissions: permissionsForRole(defaultRole),
    project_ids: [],
    can_act_as: canManageAll,
  });
  const create = useMutation({
    mutationFn: () =>
      contractorApi.create(scopeId, {
        ...form,
        permissions: permissionsWithBookAccess(form.permissions, form.book_access_mode),
      }),
    onSuccess: onCreated,
  });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const changeType = (event) => {
    const next = event.target.value;
    setForm((current) => ({
      ...current,
      type: next,
      is_executor: next !== 'agent',
      can_act_as: next === 'virtual',
    }));
  };
  return (
    <div className="contractor-modal-backdrop" onMouseDown={onClose}>
      <form
        className="contractor-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <header>
          <div>
            <strong>{canManageAll ? 'Новый актор' : 'Новый агент'}</strong>
            <small>Добавится в текущий скоуп</small>
          </div>
          <button type="button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>
        <label>
          Имя
          <input autoFocus required value={form.name} onChange={set('name')} placeholder="Имя коллеги или агента" />
        </label>
        <label>
          Должность
          <input value={form.position} onChange={set('position')} placeholder="Системный администратор" />
        </label>
        <label>
          Язык работы
          <select value={form.preferred_language} onChange={set('preferred_language')}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </label>
        <div className="contractor-form-row">
          <label>
            Тип
            <select value={form.type} disabled={!canManageAll} onChange={changeType}>
              {(options?.types ?? Object.keys(typeLabels)).map((value) => (
                <option key={value} value={value}>
                  {typeLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Роль
            <select
              value={form.role}
              disabled={!canManageAll}
              onChange={(event) => {
                const role = event.target.value;
                setForm((current) => ({
                  ...current,
                  role,
                  permissions: permissionsForRole(role),
                }));
              }}
            >
              <option value="member">Участник</option>
              <option value="observer">Наблюдатель</option>
              <option value="admin">Администратор</option>
            </select>
          </label>
        </div>
        {form.type !== 'agent' && (
          <label className="contractor-checkbox">
            <input
              type="checkbox"
              checked={form.is_executor}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  is_executor: event.target.checked,
                }))
              }
            />
            Исполнитель — показывать в назначениях и KPI
          </label>
        )}
        {form.type === 'real' && (
          <>
            <label>
              Email
              <input type="email" required value={form.email ?? ''} onChange={set('email')} />
            </label>
            <label>
              Временный пароль
              <input type="password" required minLength="8" value={form.password ?? ''} onChange={set('password')} />
            </label>
          </>
        )}
        <p className="contractor-hint">{canManageAll ? 'Роль сразу применит стандартный набор возможностей. После создания его можно точечно изменить в редакторе.' : 'Агент принадлежит вам и не сможет получить больше прав и проектов, чем есть у вашей учётки.'}</p>
        {create.error && <p className="contractor-error">{create.error.message}</p>}
        <footer>
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="contractor-primary" disabled={create.isPending}>
            Создать
          </button>
        </footer>
      </form>
    </div>
  );
}

function ContractorEditor({ scopeId, contractor, onClose, onChanged }) {
  const { check } = useAuth();
  const queryClient = useQueryClient();
  const [plainToken, setPlainToken] = useState(null);
  const [instructionCopied, setInstructionCopied] = useState(false);
  const [instructionError, setInstructionError] = useState(null);
  const [tokenComment, setTokenComment] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [editorTab, setEditorTab] = useState('profile');
  const [showArchived, setShowArchived] = useState(false);
  const [trace, setTrace] = useState(null);
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', scopeId],
    queryFn: () => projectApi.list(scopeId),
  });
  const { data: options } = useQuery({
    queryKey: ['contractor-options', scopeId],
    queryFn: () => contractorApi.options(scopeId),
  });
  const [form, setForm] = useState(() =>
    contractor
      ? {
          name: contractor.name,
          position: contractor.position ?? '',
          preferred_language: contractor.preferred_language ?? 'ru',
          type: contractor.type,
          status: contractor.status,
          email: contractor.email ?? '',
          username: contractor.username ?? '',
          role: contractor.role,
          project_access_mode: contractor.project_access_mode,
          book_access_mode: contractor.book_access_mode ?? 'none',
          project_ids: contractor.projects.map((project) => project.id),
          scope_ids: [],
          permissions: explicitPermissions(contractor),
          can_act_as: contractor.can_act_as,
        }
      : null,
  );
  const previousRole = useRef(form?.role);
  const selectedRole = form?.role;
  useEffect(() => {
    if (!selectedRole || previousRole.current === selectedRole) return;
    previousRole.current = selectedRole;
    setForm((current) => ({
      ...current,
      permissions: permissionsForRole(selectedRole),
    }));
  }, [selectedRole]);
  const saveProfile = useMutation({
    mutationFn: () =>
      contractorApi.update(scopeId, contractor.id, {
        name: form.name,
        position: form.position || null,
        preferred_language: form.preferred_language,
        status: form.status,
        email: form.email || null,
        username: form.username || null,
      }),
    onSuccess: () => {
      onChanged();
    },
  });
  const saveAccess = useMutation({
    mutationFn: () =>
      contractorApi.updateAccess(scopeId, contractor.id, {
        role: form.role,
        project_access_mode: form.project_access_mode,
        book_access_mode: form.book_access_mode,
        project_ids: form.project_ids,
        permissions: permissionsWithBookAccess(form.permissions, form.book_access_mode),
        can_act_as: form.can_act_as,
      }),
    onSuccess: onChanged,
  });
  const addScopes = useMutation({
    mutationFn: () => contractorApi.addScopes(scopeId, contractor.id, form.scope_ids),
    onSuccess: () => {
      setForm((current) => ({ ...current, scope_ids: [] }));
      onChanged();
    },
  });
  const act = useMutation({
    mutationFn: () => contractorApi.startActing(scopeId, contractor.id),
    onSuccess: async () => {
      await check();
      queryClient.invalidateQueries();
      onClose();
    },
  });
  const issue = useMutation({
    mutationFn: () =>
      contractorApi.issueToken(scopeId, contractor.id, {
        name: tokenName.trim() || 'Codex workstation',
        comment: tokenComment.trim() || null,
        abilities: (form.permissions.allow.includes('*') ? (options?.abilities ?? Object.keys(abilityLabels)) : form.permissions.allow).filter((ability) => !['contractor.manage', 'agent.manage_own'].includes(ability)),
      }),
    onSuccess: (token) => {
      setPlainToken(token.token);
      setTokenComment('');
      setTokenName('');
      onChanged();
    },
  });
  const updateToken = useMutation({
    mutationFn: ({ tokenId, comment }) => contractorApi.updateToken(scopeId, contractor.id, tokenId, { comment: comment.trim() || null }),
    onSuccess: onChanged,
  });
  const revoke = useMutation({
    mutationFn: (tokenId) => contractorApi.revokeToken(scopeId, contractor.id, tokenId),
    onSuccess: (_, tokenId) => {
      if (plainToken?.startsWith(`${tokenId}|`)) setPlainToken(null);
      onChanged();
    },
  });
  const copyAgentInstruction = async () => {
    setInstructionError(null);
    try {
      const token = plainToken ?? (await issue.mutateAsync()).token;
      const specification = await fetchAgentSpecification(token);
      await navigator.clipboard.writeText(buildAgentInstruction(token, specification));
      setInstructionCopied(true);
      window.setTimeout(() => setInstructionCopied(false), 2200);
    } catch (error) {
      setInstructionError(error);
    }
  };
  if (!contractor || !form) return <aside className="contractor-editor">Загружаю…</aside>;
  const toggleProject = (projectId) =>
    setForm((current) => ({
      ...current,
      project_ids: current.project_ids.includes(projectId) ? current.project_ids.filter((id) => id !== projectId) : [...current.project_ids, projectId],
    }));
  const setAbility = (ability, value) =>
    setForm((current) => ({
      ...current,
      permissions: {
        allow: current.permissions.allow.filter((item) => item !== ability),
        deny: current.permissions.deny.filter((item) => item !== ability),
        ...(value === 'allow'
          ? {
              allow: [...current.permissions.allow.filter((item) => item !== ability), ability],
            }
          : {}),
        ...(value === 'deny'
          ? {
              deny: [...current.permissions.deny.filter((item) => item !== ability), ability],
            }
          : {}),
      },
    }));
  return (
    <aside className="contractor-editor">
      <header>
        <div className={`contractor-editor-icon contractor-card--${contractor.type}`}>
          <TypeIcon type={contractor.type} />
        </div>
        <div>
          <strong>{contractor.name}</strong>
          <small>{typeLabels[contractor.type]}</small><AttachmentsButton scopeId={scopeId} type="user" id={contractor.id}/>
        </div>
        <button onClick={onClose}>
          <IconX size={19} />
        </button>
      </header>
      {contractor.type === 'agent' && <nav className="contractor-editor-tabs" aria-label="Разделы редактора"><button className={editorTab === 'profile' ? 'active' : ''} onClick={() => setEditorTab('profile')}>Профиль и доступ</button><button className={editorTab === 'connections' ? 'active' : ''} onClick={() => setEditorTab('connections')}>Подключения и ключи</button></nav>}
      <div hidden={contractor.type === 'agent' && editorTab !== 'profile'}>
      <section>
        <h2>Профиль</h2>
        <div className="contractor-form-row">
          <label>
            Имя
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Статус
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Должность
          <input
            value={form.position}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                position: event.target.value,
              }))
            }
            placeholder="Кто есть кто"
          />
        </label>
        <label>
          Язык работы
          <select
            value={form.preferred_language}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                preferred_language: event.target.value,
              }))
            }
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <small>Этот язык попадёт в инструкцию агенту.</small>
        </label>
        <div className="contractor-form-row">
          <label>
            Логин
            <input
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Email
            <input
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <button className="contractor-secondary" onClick={() => saveProfile.mutate()}>
          Сохранить профиль
        </button>
      </section>
      <section>
        <h2>Доступ к скоупам</h2>
        <div className="contractor-scope-list">
          {(contractor.scopes ?? []).map((item) => (
            <span key={item.id}>
              {item.name}
              <small>{item.role}</small>
            </span>
          ))}
        </div>
        <div className="contractor-scope-add">
          {(options?.manageable_scopes ?? [])
            .filter((item) => !(contractor.scopes ?? []).some((scope) => scope.id === item.id))
            .map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={form.scope_ids.includes(item.id)}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      scope_ids: current.scope_ids.includes(item.id) ? current.scope_ids.filter((id) => id !== item.id) : [...current.scope_ids, item.id],
                    }))
                  }
                />
                {item.name}
              </label>
            ))}
        </div>
        <button className="contractor-secondary" disabled={!form.scope_ids.length || addScopes.isPending} onClick={() => addScopes.mutate()}>
          Добавить выбранные скоупы
        </button>
      </section>
      <section>
        <h2>Область доступа текущего скоупа</h2>
        <div className="contractor-form-row">
          <label>
            Роль
            <select value={form.role} disabled={form.role === 'owner'} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
              {form.role === 'owner' && <option value="owner">Владелец</option>}
              <option value="admin">Администратор</option>
              <option value="member">Участник</option>
              <option value="observer">Наблюдатель</option>
            </select>
          </label>
          <label>
            Проекты
            <select
              value={form.project_access_mode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  project_access_mode: event.target.value,
                }))
              }
            >
              <option value="all">Все проекты</option>
              <option value="restricted">Только выбранные</option>
              <option value="none">Без проектов</option>
            </select>
          </label>
        </div>
        {form.project_access_mode === 'restricted' && (
          <div className="contractor-projects">
            {projects.map((project) => (
              <label key={project.id}>
                <input type="checkbox" checked={form.project_ids.includes(project.id)} onChange={() => toggleProject(project.id)} />
                <i style={{ background: project.color }} />
                <span>
                  {project.key} · {project.title}
                </span>
              </label>
            ))}
          </div>
        )}
        <label>
          Доступ к Booker
          <select
            value={form.book_access_mode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                book_access_mode: event.target.value,
              }))
            }
          >
            <option value="none">Запретить</option>
            <option value="projects">Книги доступных проектов</option>
            <option value="all">Все доступные книги скоупа</option>
          </select>
          <small>Приватные книги остаются доступны только создателю. Создание, редактирование и удаление задаются возможностями ниже.</small>
        </label>
        <h3>Возможности и запреты</h3>
        <div className="contractor-abilities">
          {(options?.abilities ?? Object.keys(abilityLabels)).map((ability) => {
            const value = form.permissions.deny.includes(ability) ? 'deny' : form.permissions.allow.includes(ability) ? 'allow' : 'inherit';
            return (
              <label key={ability}>
                <span>
                  {abilityLabels[ability] ?? ability}
                  <code>{ability}</code>
                </span>
                <select value={value} onChange={(event) => setAbility(ability, event.target.value)}>
                  <option value="inherit">По роли</option>
                  <option value="allow">Разрешить</option>
                  <option value="deny">Запретить</option>
                </select>
              </label>
            );
          })}
        </div>
        {contractor.type === 'virtual' && (
          <label className="contractor-checkbox">
            <input
              type="checkbox"
              checked={form.can_act_as}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  can_act_as: event.target.checked,
                }))
              }
            />
            Разрешить мне работать от имени этого пользователя
          </label>
        )}
        <button className="contractor-primary" onClick={() => saveAccess.mutate()}>
          Сохранить доступ
        </button>
      </section>
      {contractor.type === 'virtual' && (
        <section className="contractor-persona">
          <h2>Виртуальная персона</h2>
          <p>Новые задачи и комментарии будут подписаны этим пользователем. Реальный оператор останется в аудите.</p>
          <button disabled={!contractor.can_act_as || act.isPending} onClick={() => act.mutate()}>
            <IconUserCog size={17} />
            Работать от имени {contractor.name}
          </button>
        </section>
      )}
      </div>
      {contractor.type === 'agent' && editorTab === 'connections' && (
        <section>
          <div className="contractor-connections-heading"><h2>Ключи агента</h2><button className="contractor-secondary" onClick={() => setTrace({})}><IconActivity size={16}/> Следы агента</button></div>
          <p className="contractor-hint">Права задаются во вкладке «Профиль и доступ». Секрет нового ключа показывается один раз.</p>
          <label className="contractor-token-comment">Название подключения<input value={tokenName} maxLength={100} placeholder="Например: Рабочий ПК · склад" onChange={(event) => setTokenName(event.target.value)}/></label>
          <label className="contractor-token-comment">
            Топик и назначение нового подключения
            <textarea value={tokenComment} maxLength={500} placeholder="Например: Codex на рабочем ПК · WMS-31 · накладные и резервы" onChange={(event) => setTokenComment(event.target.value)} />
          </label>
          <div className="contractor-agent-actions">
            <button className="contractor-token-button" disabled={issue.isPending || form.permissions.allow.filter((item) => item !== 'contractor.manage').length === 0} onClick={() => issue.mutate()}>
              <IconKey size={17} />
              {issue.isPending ? 'Выпускаю…' : 'Выпустить ключ для Codex'}
            </button>
            <button className="contractor-instruction-button" disabled={issue.isPending} title={plainToken ? 'Скопировать ключ и полную актуальную спецификацию' : 'Выпустить новый ключ и скопировать полную актуальную спецификацию'} onClick={copyAgentInstruction}>
              <IconCopy size={17} />
              {issue.isPending ? 'Готовлю инструкцию…' : instructionCopied ? 'Полная инструкция скопирована' : plainToken ? 'Скопировать полную инструкцию' : 'Выпустить ключ и скопировать инструкцию'}
            </button>
          </div>
          {plainToken && (
            <div className="contractor-token">
              <strong>Скопируйте сейчас</strong>
              <code>{plainToken}</code>
              <button onClick={() => navigator.clipboard.writeText(plainToken)}>
                <IconCopy size={15} />
                Копировать
              </button>
            </div>
          )}
          <div className="contractor-token-list">
            {(contractor.tokens ?? []).filter((token) => !isArchivedToken(token)).map((token) => <AgentTokenRow key={`${token.id}:${token.comment ?? ''}`} token={token} onSave={(comment) => updateToken.mutateAsync({ tokenId: token.id, comment })} onTrace={() => setTrace({ tokenId: token.id, name: token.name })} onRevoke={() => { if (window.confirm(`Отозвать подключение #${token.id} «${token.name}»? Его ключ перестанет работать.`)) revoke.mutate(token.id); }} revoking={revoke.isPending}/>)}
            {!(contractor.tokens ?? []).some((token) => !isArchivedToken(token)) && <p className="contractor-hint">Активных подключений нет.</p>}
          </div>
          <button className="contractor-secondary" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}>Архивные ({(contractor.tokens ?? []).filter(isArchivedToken).length}) {showArchived ? '▴' : '▾'}</button>
          {showArchived && <div className="contractor-token-list contractor-token-archive">{(contractor.tokens ?? []).filter(isArchivedToken).map((token) => <AgentTokenRow key={`${token.id}:${token.comment ?? ''}`} token={token} onSave={(comment) => updateToken.mutateAsync({ tokenId: token.id, comment })} onTrace={() => setTrace({ tokenId: token.id, name: token.name })}/>)}<p className="contractor-hint">Отозванные ключи не восстанавливаются. Их комментарии и следы сохраняются.</p></div>}
          {(instructionError || revoke.error) && <p className="contractor-error">{(instructionError || revoke.error).message}</p>}
        </section>
      )}
      {trace && <AgentTraceModal key={trace.tokenId ?? 'all'} scopeId={scopeId} contractor={contractor} token={trace} onClose={() => setTrace(null)}/>}
      {(saveProfile.error || saveAccess.error || addScopes.error || act.error || issue.error) && <p className="contractor-error">{(saveProfile.error || saveAccess.error || addScopes.error || act.error || issue.error).message}</p>}
    </aside>
  );
}

function AgentTokenRow({ token, onSave, onTrace, onRevoke, revoking }) {
  const [comment, setComment] = useState(token.comment ?? '');
  const [saved, setSaved] = useState(token.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (busy || comment.trim() === saved) return;
    setBusy(true); setError('');
    try { await onSave(comment); setSaved(comment.trim()); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <div className="contractor-token-row"><div className="contractor-token-info"><strong><small>#{token.id}</small> {token.name}</strong>
    <textarea aria-label={`Комментарий ключа #${token.id}`} rows={1} maxLength={500} disabled={busy} value={comment} placeholder="Где и для чего используется…" onChange={(event) => setComment(event.target.value)} onBlur={save} onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.blur(); } if (event.key === 'Escape') { event.stopPropagation(); setComment(saved); setError(''); } }}/>
    {busy && <small role="status">Сохраняю…</small>}{error && <p className="contractor-error" role="alert">{error} <button onClick={save}>Повторить</button></p>}
    <small>Выпущен {new Date(token.created_at).toLocaleString()}</small><small>{token.last_used_at ? `Использован ${new Date(token.last_used_at).toLocaleString()}` : 'Ещё не использован'}</small>
    {token.revoked_at ? <small>Отозван {new Date(token.revoked_at).toLocaleString()}</small> : token.expires_at && <small>{isArchivedToken(token) ? 'Истёк' : 'Действует до'} {new Date(token.expires_at).toLocaleString()}</small>}
    </div><div className="contractor-token-actions"><button onClick={onTrace}><IconActivity size={14}/> Следы</button>{onRevoke && <button disabled={revoking} onClick={onRevoke}>Отозвать</button>}</div></div>;
}

function AgentTraceModal({ scopeId, contractor, token, onClose }) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  const { data, error, isPending, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['contractor-activity', scopeId, contractor.id, token.tokenId ?? null],
    queryFn: ({ pageParam, signal }) => contractorApi.activity(scopeId, contractor.id, { cursor: pageParam, tokenId: token.tokenId, signal }),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta?.next_cursor ?? undefined,
    gcTime: 0,
  });
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key === 'Tab') {
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled), summary')];
        const index = controls.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && (index < 0 || index === controls.length - 1)) { event.preventDefault(); controls[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => { document.removeEventListener('keydown', keydown, true); if (previous?.isConnected) previous.focus(); };
  }, []);
  const items = data?.pages.flatMap((page) => page.data) ?? [];
  return createPortal(<div className="contractor-trace-backdrop" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}><div className="contractor-trace-modal" role="dialog" aria-modal="true" aria-label="Следы агента" tabIndex={-1} ref={dialog}>
    <header><div><strong>Следы · {contractor.name}</strong><small>{token.tokenId ? `Подключение #${token.tokenId} · ${token.name}` : 'Все подключения · текущий скоуп'}</small></div><button aria-label="Закрыть следы" onClick={onClose}><IconX size={20}/></button></header>
    <p className="contractor-hint">{token.tokenId ? 'Запросы, достоверно связанные с этим ключом. Доменные события без ID ключа доступны в общих следах.' : 'Запросы API, доменные события и версии Lore в этом скоупе.'} Секреты вырезаются.</p>
    <div className="contractor-trace-scroll"><div className="contractor-agent-trace-list">{items.map((item) => <article key={item.id}><header><strong title={agentActivityTitle(item)}>{agentActivityTitle(item)}</strong><time>{new Date(item.created_at).toLocaleString()}</time></header>
      {item.kind === 'api' && <p><b>{item.after?.status}</b> · {item.after?.duration_ms} мс · #{item.context?.token_id} {item.context?.token_name}{item.context?.token_comment ? ` · ${item.context.token_comment}` : ''}</p>}
      {item.kind === 'lore' && <p>{item.after?.title}</p>}{item.ip_address && <small>{item.ip_address}{item.user_agent ? ` · ${item.user_agent}` : ''}</small>}
      <details><summary>Технические детали</summary><pre>{JSON.stringify({ subject_type: item.subject_type, subject_id: item.subject_id, before: item.before, after: item.after, context: item.context }, null, 2)}</pre></details>
    </article>)}</div>
    {isPending && <p role="status">Загружаю следы…</p>}{!isPending && !error && !items.length && <p>Следов в этом скоупе пока нет.</p>}
    {error && <p className="contractor-error" role="alert">{error.message} <button onClick={() => items.length ? fetchNextPage() : refetch()}>Повторить</button></p>}
    {hasNextPage && <button className="contractor-trace-more" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>{isFetchingNextPage ? 'Загружаю…' : 'Показать ещё'}</button>}
    </div></div></div>, document.body);
}
