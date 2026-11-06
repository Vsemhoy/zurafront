import { AvatarImage } from '../shared/ui/AvatarImage';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { IconKey, IconPlus, IconRobot, IconSearch, IconUser, IconUserCog, IconUsers, IconX } from '@tabler/icons-react';
import { useWorkspace } from '../app/workspace';
import { contractorApi } from '../entities/contractor/api';
import { permissionsForRole, permissionsWithBookAccess } from '../entities/contractor/editor';
import { departmentApi } from '../entities/department/api';
import { filterContractors } from '../entities/contractor/filters';
import { DepartmentFilter } from '../shared/ui/DepartmentFilter';
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
function TypeIcon({ type, size = 18 }) {
  if (type === 'agent') return <IconRobot size={size} />;
  if (type === 'virtual') return <IconUserCog size={size} />;
  return <IconUser size={size} />;
}

export function ContractorPage() {
  const { activeScope } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [departmentSelection, setDepartmentSelection] = useState(null);
  const departmentId = departmentSelection?.scopeId === activeScope?.id ? departmentSelection?.id ?? '' : '';
  const [creating, setCreating] = useState(false);
  const key = ['contractors', activeScope?.id];
  const departmentOptions = useQuery({
    queryKey: ['departments', activeScope?.id],
    queryFn: () => departmentApi.list(activeScope.id),
    enabled: Boolean(activeScope),
  });
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
  const filtered = filterContractors(contractors, { type, search, departmentId, departments: departmentOptions.data?.departments });
  const counts = Object.fromEntries(['real', 'virtual', 'agent'].map((item) => [item, contractors.filter((contractor) => contractor.type === item).length]));
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
          <h1>{options?.can_manage_all === false ? 'Мой профиль и агенты' : 'Contractor'}</h1>
          <small>{contractors.length} акторов</small>
        </div>
        <label>
          <IconSearch size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти актора…" />
        </label>
        {options?.can_manage_all !== false && <button disabled={!options} onClick={() => setCreating('virtual')}>
          <IconPlus size={17} />
          Новый пользователь
        </button>}
        <button disabled={!options || !options.types?.includes('agent')} onClick={() => setCreating('agent')}>
          <IconRobot size={17} />
          Новый агент
        </button>
      </header>
      <div className="contractor-layout">
        <aside className="contractor-filters">
          <DepartmentFilter departments={departmentOptions.data?.departments} value={departmentId}
            onChange={(id) => setDepartmentSelection({ scopeId: activeScope?.id, id })} />
          <strong>Типы</strong>
          {(options?.can_manage_all === false
            ? [['all', 'Мой профиль и агенты', contractors.length], ['agent', 'Агенты', counts.agent]]
            : [
                ['all', 'Все', contractors.length],
                ['real', 'Реальные', counts.real],
                ['virtual', 'Виртуальные', counts.virtual],
                ['agent', 'Агенты', counts.agent],
              ]
          ).map(([value, label, count]) => (
            <button key={value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>
              <span>{label}</span>
              <i>{count}</i>
            </button>
          ))}
        </aside>
        <section className="contractor-content">
          {!activeScope && <div className="contractor-state">Выберите скоуп.</div>}
          {isLoading && <div className="contractor-state">Загружаю акторов…</div>}
          {error && <div className="contractor-state contractor-error">{error.message}</div>}
          {departmentOptions.error && <div role="alert" className="contractor-error">Не удалось загрузить отделы: {departmentOptions.error.message}</div>}
          <div className="contractor-table">
            <div className="contractor-table-head">
              <span>Человек</span>
              <span>Тип</span>
              <span>Статус</span>
              <span>Исполнитель</span>
              <span>Проекты</span>
            </div>
            {filtered.map((contractor) => (
              <Link key={contractor.id} className={`contractor-row contractor-card--${contractor.type}`} to={`/contractors/${activeScope.id}/${contractor.id}`}>
                <span className="contractor-person">
                  <i className="contractor-avatar">
                    {contractor.profile?.avatar ? <AvatarImage avatar={contractor.profile.avatar} name={contractor.name}/> : <TypeIcon type={contractor.type} />}
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
              </Link>
            ))}
          </div>
          {!isLoading && filtered.length === 0 && <div className="contractor-state">Никого не нашли.</div>}
        </section>
      </div>
      {creating && activeScope && (
        <ContractorCreate
          scopeId={activeScope.id}
          options={options}
          initialType={creating}
          onClose={() => setCreating(false)}
          onCreated={(contractor) => {
            queryClient.setQueryData(key, (current = []) => [contractor, ...current.filter((item) => item.id !== contractor.id)]);
            refresh();
            setCreating(false);
            navigate(`/contractors/${activeScope.id}/${contractor.id}`);
          }}
        />
      )}
    </main>
  );
}

function ContractorCreate({ scopeId, options, initialType, onClose, onCreated }) {
  const canManageAll = options?.can_manage_all !== false;
  const defaultRole = canManageAll ? 'member' : 'observer';
  const [form, setForm] = useState({
    name: '',
    position: '',
    preferred_language: 'ru',
    type: canManageAll ? initialType : 'agent',
    is_executor: canManageAll && initialType !== 'agent',
    role: defaultRole,
    project_access_mode: 'none',
    book_access_mode: 'none',
    permissions: permissionsForRole(defaultRole),
    project_ids: [],
    can_act_as: canManageAll && initialType === 'virtual',
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
  const changeType = (next) => {
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
            <strong>{form.type === 'agent' ? 'Новый агент' : 'Новый пользователь'}</strong>
            <small>Добавится в текущий скоуп</small>
          </div>
          <button type="button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>
        <fieldset className="contractor-create-types">
          <legend>Тип аккаунта</legend>
          {(options?.types ?? ['agent']).map((value) => (
            <button key={value} type="button" aria-pressed={form.type === value}
              disabled={!canManageAll} onClick={() => changeType(value)}>
              <TypeIcon type={value} size={16} />{typeLabels[value]}
            </button>
          ))}
        </fieldset>
        <label>
          Имя
          <input autoFocus required value={form.name} onChange={set('name')} placeholder="Имя коллеги или агента" />
        </label>
        <label>
          Должность
          <input value={form.position} onChange={set('position')} placeholder="Системный администратор" />
        </label>

        <div className="contractor-form-row">
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
