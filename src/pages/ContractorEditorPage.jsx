import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IconActivity, IconArrowLeft, IconCopy, IconKey, IconTrash, IconUserCog, IconX } from '@tabler/icons-react';
import { AvatarImage } from '../shared/ui/AvatarImage';
import { AvatarPicker } from '../shared/ui/AvatarPicker';
import { AttachmentsButton } from '../shared/ui/AttachmentsButton';
import { EditorSaveBar } from '../shared/ui/EditorSaveBar';
import { useSaveForm } from '../shared/ui/useSaveForm';
import { useWorkspace } from '../app/workspace';
import { useAuth } from '../auth';
import { contractorApi } from '../entities/contractor/api';
import { projectApi } from '../entities/project/api';
import { abilityLabels, permissionsForRole, contractorDraft, saveContractorDraft, setContractorAbility } from '../entities/contractor/editor';
import { ContractorAbilities } from './ContractorAbilities';
import './ContractorPage.css';
import './ContractorModalFix.css';
import './ContractorAccountTools.css';
import './ContractorAgentInstruction.css';
import './ContractorEditorPage.css';

const typeLabels = { real: 'Реальный', virtual: 'Виртуальный', agent: 'Агент' };
const isArchivedToken = (token) => Boolean(token.revoked_at || (token.expires_at && new Date(token.expires_at).getTime() <= Date.now()));
const statusLabels = {
  active: 'Активен',
  blocked: 'Заблокирован',
  dormant: 'Спит',
};

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

function agentActivityTitle(item) {
  if (item.kind === 'lore') return `${item.after?.code ?? 'Lore'} · версия ${item.after?.version ?? '—'}`;
  if (item.kind === 'api') return `${item.action.replace('agent.api.', '').toUpperCase()} ${item.context?.path ?? ''}`;
  return item.action;
}

export function ContractorEditorPage() {
  const { scopeId, contractorId } = useParams();
  const { activeScope } = useWorkspace();
  const navigate = useNavigate();
  const client = useQueryClient();
  const available = Boolean(scopeId && activeScope?.id === scopeId);
  const query = useQuery({
    queryKey: ['contractors', scopeId], queryFn: () => contractorApi.list(scopeId), enabled: available,
  });
  const onChanged = () => Promise.all(['contractors', 'contractors-assignable', 'task-assignable', 'kpi-stats', 'dashboard'].map((key) => client.invalidateQueries({ queryKey: [key, scopeId] })));
  const contractor = query.data?.find((item) => item.id === contractorId);
  return <div className="contractor-detail-page">
    {!available ? <div className="contractor-state" role="alert">Этот скоуп недоступен. <Link to="/contractors">К списку пользователей</Link></div>
      : query.isPending ? <div className="contractor-state" role="status">Загружаю пользователя…</div>
      : query.error && !query.data ? <div className="contractor-state contractor-error" role="alert">{query.error.message} <button onClick={() => query.refetch()}>Повторить</button> <Link to="/contractors">К списку</Link></div>
      : !contractor ? <div className="contractor-state" role="alert">Пользователь не найден или недоступен в этом скоупе. <Link to="/contractors">К списку</Link></div>
      : <ContractorEditor key={`${scopeId}:${contractorId}`} scopeId={scopeId} scopeName={activeScope.name} contractor={contractor} onClose={() => navigate('/contractors')} onChanged={onChanged}/>}
    {query.error && query.data && <p role="alert" className="contractor-error">Не удалось обновить данные. Ваши правки остаются в редакторе. <button type="button" onClick={() => query.refetch()}>Повторить</button></p>}
  </div>;
}

function ContractorDeleteButton({ scopeId, contractor, onDeleted, disabled }) {
  const remove = useMutation({
    mutationFn: () => contractorApi.remove(scopeId, contractor.id),
    onSuccess: onDeleted,
  });
  const confirmDelete = () => {
    if (window.confirm(`Удалить «${contractor.name}»? Вход будет заблокирован, токены отозваны. Существующие назначения и история сохранятся.`)) remove.mutate();
  };
  return (
    <div className="contractor-delete">
      <button disabled={disabled || remove.isPending} onClick={confirmDelete}>
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

        <label className="contractor-executor-toggle">
          <input type="checkbox" checked={Boolean(contractor.is_executor)} disabled={saveExecutor.isPending} onChange={(event) => saveExecutor.mutate(event.target.checked)} />
          <span>Исполнитель</span>
        </label>
        <button onClick={() => { setLogin({ username: contractor.username ?? '', email: contractor.email ?? '', password: '' }); saveLogin.reset(); setLoginOpen(true); }}>{contractor.type === 'virtual' ? 'Оживить и разрешить вход' : 'Сменить пароль'}</button>
        {saveExecutor.isPending && <small>сохраняю…</small>}
        {saveExecutor.error && <small role="alert" className="contractor-error">{saveExecutor.error.message}</small>}
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

function ContractorEditor({ scopeId, scopeName, contractor, onClose, onChanged }) {
  const [avatarVisible, setAvatarVisible] = useState(false);
  const avatarTrigger = useRef(null);
  const { check } = useAuth();
  const queryClient = useQueryClient();
  const [plainToken, setPlainToken] = useState(null);
  const [instructionCopied, setInstructionCopied] = useState(false);
  const [instructionError, setInstructionError] = useState(null);
  const [tokenComment, setTokenComment] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [editorTab, setEditorTab] = useState('profile');
  const [scopeIds, setScopeIds] = useState([]);
  const profileForm = useRef(null);
  const currentUser = useAuth((state) => state.user);
  const [showArchived, setShowArchived] = useState(false);
  const [trace, setTrace] = useState(null);
  const projectQuery = useQuery({
    queryKey: ['projects', scopeId],
    queryFn: () => projectApi.list(scopeId),
  });
  const optionsQuery = useQuery({
    queryKey: ['contractor-options', scopeId],
    queryFn: () => contractorApi.options(scopeId),
  });
  const projects = projectQuery.data ?? [];
  const options = optionsQuery.data;
  const initial = useMemo(() => contractorDraft(contractor), [contractor]);
  const saved = useSaveForm({
    initial, label: 'Настройки пользователя', active: contractor.can_manage,
    validate: () => {
      const valid = profileForm.current?.checkValidity() ?? true;
      if (!valid) { setEditorTab('profile'); requestAnimationFrame(() => profileForm.current?.reportValidity()); }
      return valid;
    },
    persist: (draft, baseline) => saveContractorDraft(contractorApi, scopeId, contractor.id, draft, baseline),
    onSaved: () => { onChanged(); if (contractor.id === currentUser?.id) void check(); },
  });
  const form = saved.draft;
  const setForm = saved.change;
  const addScopes = useMutation({
    mutationFn: () => contractorApi.addScopes(scopeId, contractor.id, scopeIds),
    onSuccess: () => {
      setScopeIds([]);
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
  const toggleProject = (projectId) =>
    setForm((current) => ({
      ...current,
      project_ids: current.project_ids.includes(projectId) ? current.project_ids.filter((id) => id !== projectId) : [...current.project_ids, projectId],
    }));
  const setAbility = (ability, value) =>
    setForm((current) => ({
      ...current,
      permissions: setContractorAbility(current.permissions, ability, value, options?.abilities ?? []),
      ...(ability === 'book.view' && value === 'deny' ? { book_access_mode: 'none' } : {}),
    }));
  return (
    <main className="contractor-editor contractor-editor--page">
      <header>
        <button type="button" ref={avatarTrigger} className={`contractor-editor-icon contractor-card--${contractor.type}`} aria-label="Настройки аватара" aria-expanded={avatarVisible} onClick={() => { setAvatarVisible((visible) => !visible); setEditorTab('profile'); }}>
          <AvatarImage avatar={contractor.profile?.avatar} name={contractor.name}/>
        </button>
        <div className="contractor-editor-identity">
          <h1>{contractor.name}</h1>
          <small>{typeLabels[contractor.type]} · {statusLabels[contractor.status]} · {scopeName}</small><AttachmentsButton scopeId={scopeId} type="user" id={contractor.id}/>
        </div>
        <button className="contractor-back-link" onClick={onClose}><IconArrowLeft size={17}/>К списку</button>
      </header>
      <div className="contractor-editor-save">
        {!contractor.can_manage ? <p className="contractor-hint">Просмотр профиля. Изменение настроек недоступно.</p> : <EditorSaveBar {...saved} disabled={!options} onSave={saved.save}/>}
        {optionsQuery.error && <p role="alert" className="contractor-error">Не удалось загрузить настройки доступа. <button type="button" onClick={() => optionsQuery.refetch()}>Повторить</button></p>}
        {saved.error && <p role="alert" className="contractor-error">{saved.error}</p>}
      </div>
      <nav className="contractor-editor-tabs" aria-label="Разделы редактора">
        {[['profile', 'Профиль'], ['access', 'Модули и проекты'], ['scopes', 'Скоупы'], ...(contractor.type === 'agent' ? [['connections', 'Подключения и ключи']] : [])].map(([id, title]) => <button key={id} type="button" aria-pressed={editorTab === id} className={editorTab === id ? 'active' : ''} onClick={() => setEditorTab(id)}>{title}</button>)}
      </nav>
      <div hidden={editorTab !== 'profile'}>
      <section>
        <h2>Профиль</h2>
        {avatarVisible && <AvatarPicker scopeId={scopeId} contractor={contractor} onClose={() => { setAvatarVisible(false); avatarTrigger.current?.focus(); }} onChanged={async () => { await onChanged(); await check(); }}/>}
        <form ref={profileForm} onSubmit={(event) => { event.preventDefault(); void saved.save(); }}>
        <fieldset className="contractor-edit-fields" disabled={!contractor.can_manage || saved.busy}>
        <div className="contractor-form-row">
          <label>
            Имя
            <input required maxLength={255} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
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
            <input type="email"
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
        <label>Язык пользователя<select value={form.preferred_language} onChange={(event) => setForm((current) => ({ ...current, preferred_language: event.target.value }))}><option value="ru">Русский</option><option value="en">English</option><option value="zh">中文</option></select><small>Предпочтительный язык общения с пользователем и ответов агента.</small></label>
        </fieldset>
        </form>
      </section>
      {contractor.can_manage && contractor.type !== 'agent' && <section className="contractor-account-section">
        <p className="contractor-hint">Исполнитель и данные входа сохраняются отдельно.{saved.dirty ? ' Сначала сохраните изменения профиля и доступов.' : ''}</p>
        <fieldset className="contractor-edit-fields" disabled={saved.dirty || saved.busy}>
        <ContractorAccountTools scopeId={scopeId} contractor={contractor} onChanged={onChanged}/>
        </fieldset>
      </section>}
      </div>
      <fieldset className="contractor-edit-fields" disabled={!contractor.can_manage || saved.busy}>
      <section hidden={editorTab !== 'scopes'}>
        <h2>Доступ к скоупам</h2>
        <p className="contractor-hint">Права в каждом скоупе независимы. Здесь добавляется членство; доступы настраиваются в нужном скоупе.</p>
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
                  checked={scopeIds.includes(item.id)}
                  onChange={() =>
                    setScopeIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])
                  }
                />
                {item.name}
              </label>
            ))}
        </div>
        <button className="contractor-secondary" disabled={!scopeIds.length || addScopes.isPending} onClick={() => addScopes.mutate()}>
          Добавить выбранные скоупы
        </button>
      </section>
      <section hidden={editorTab !== 'access'}>
        <h2>Доступ · {scopeName}</h2>
        <p className="contractor-hint">Права модуля не открывают приватные записи, закрытые проекты и выключенные модули. Агенту также нужны соответствующие права в ключе.</p>
        <div className="contractor-form-row">
          <label>
            Роль
            <select value={form.role} disabled={form.role === 'owner'} onChange={(event) => { const role = event.target.value; setForm((current) => ({ ...current, role, permissions: permissionsForRole(role) })); }}>
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
        <p className="contractor-hint contractor-role-hint">Смена роли применяет её пресет возможностей. Ниже можно задать точечные исключения.</p>
        {projectQuery.error && <p role="alert" className="contractor-error">Не удалось загрузить проекты. <button type="button" onClick={() => projectQuery.refetch()}>Повторить</button></p>}
        {projectQuery.isPending && <p role="status">Загружаю проекты…</p>}
        {options ? <ContractorAbilities abilities={options.abilities ?? []} permissions={form.permissions} onChange={setAbility} bookMode={form.book_access_mode} onBookModeChange={(book_access_mode) => setForm((current) => ({ ...current, book_access_mode }))}/> : <p role="status">Загружаю возможности…</p>}
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

      </section>
      {contractor.type === 'virtual' && (
        <section className="contractor-persona" hidden={editorTab !== 'profile'}>
          <h2>Виртуальная персона</h2>
          <p>Новые задачи и комментарии будут подписаны этим пользователем. Реальный оператор останется в аудите.</p>
          <button disabled={!contractor.can_act_as || act.isPending} onClick={() => saved.leave(() => act.mutate())}>
            <IconUserCog size={17} />
            Работать от имени {contractor.name}
          </button>
        </section>
      )}
      </fieldset>
      {editorTab === 'profile' && contractor.can_manage && contractor.id !== currentUser?.id && <ContractorDeleteButton scopeId={scopeId} contractor={contractor} disabled={saved.dirty || saved.busy} onDeleted={() => { onChanged(); onClose(); }}/>}
      {editorTab === 'profile' && saved.dirty && <p className="contractor-hint">Перед удалением сохраните изменения или выйдите без сохранения.</p>}
      {contractor.type === 'agent' && editorTab === 'connections' && (
        <section>
          <div className="contractor-connections-heading"><h2>Ключи агента</h2><button className="contractor-secondary" onClick={() => setTrace({})}><IconActivity size={16}/> Следы агента</button></div>
          <p className="contractor-hint">Права задаются во вкладке «Модули и проекты». Секрет нового ключа показывается один раз. Подключения сохраняются отдельно.</p>
          {saved.dirty && <p className="contractor-hint">Перед выпуском ключа сохраните изменения профиля и доступов.</p>}
          <label className="contractor-token-comment">Название подключения<input value={tokenName} maxLength={100} placeholder="Например: Рабочий ПК · склад" onChange={(event) => setTokenName(event.target.value)}/></label>
          <label className="contractor-token-comment">
            Топик и назначение нового подключения
            <textarea value={tokenComment} maxLength={500} placeholder="Например: Codex на рабочем ПК · WMS-31 · накладные и резервы" onChange={(event) => setTokenComment(event.target.value)} />
          </label>
          <div className="contractor-agent-actions">
            <button className="contractor-token-button" disabled={!contractor.can_manage || saved.dirty || saved.busy || issue.isPending || form.permissions.allow.filter((item) => item !== 'contractor.manage').length === 0} onClick={() => issue.mutate()}>
              <IconKey size={17} />
              {issue.isPending ? 'Выпускаю…' : 'Выпустить ключ для Codex'}
            </button>
            <button className="contractor-instruction-button" disabled={!contractor.can_manage || saved.dirty || saved.busy || issue.isPending} title={plainToken ? 'Скопировать ключ и полную актуальную спецификацию' : 'Выпустить новый ключ и скопировать полную актуальную спецификацию'} onClick={copyAgentInstruction}>
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
      {(addScopes.error || act.error || issue.error) && <p role="alert" className="contractor-error">{(addScopes.error || act.error || issue.error).message}</p>}
    </main>
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
