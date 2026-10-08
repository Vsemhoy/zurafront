import "./TaskAssignmentFields.css";
import { contractorCanAccessProject } from "./taskAssignmentAccess";

export function TaskAssignmentFields({
  assignees = [],
  agents = [],
  assigneeId,
  agentDelegatable = false,
  delegatedAgentId,
  currentAssignee,
  currentAgent,
  projectId,
  departmentId,
  onChange,
}) {
  const eligibleAssignees = assignees.filter((item) =>
    departmentId || contractorCanAccessProject(item, projectId),
  );
  const eligibleAgents = agents.filter((item) =>
    contractorCanAccessProject(item, projectId),
  );

  return (
    <section className="task-assignment-fields">
      <label>
        Назначить исполнителя
        <select
          value={assigneeId ?? ""}
          onChange={(event) =>
            onChange({ assignee_id: event.target.value || null })
          }
        >
          <option value="">Не назначен</option>
          {assigneeId && !eligibleAssignees.some((item) => item.id === assigneeId) && (
            <option value={assigneeId} disabled>{currentAssignee?.name ?? "Прежний исполнитель"} · недоступен</option>
          )}
          {eligibleAssignees.map((contractor) => (
            <option key={contractor.id} value={contractor.id}>
              {contractor.is_current ? "Я — " : ""}
              {contractor.name}
              {contractor.type === "virtual" ? " · виртуальный" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="task-agent-toggle">
        <input
          type="checkbox"
          checked={agentDelegatable}
          onChange={(event) =>
            onChange({
              is_agent_delegatable: event.target.checked,
              delegated_agent_id: event.target.checked
                ? delegatedAgentId || null
                : null,
            })
          }
        />
        Можно делегировать агенту
      </label>
      {agentDelegatable && (
        <label>
          Агент
          <select
            value={delegatedAgentId ?? ""}
            onChange={(event) =>
              onChange({
                is_agent_delegatable: true,
                delegated_agent_id: event.target.value || null,
              })
            }
          >
            <option value="">Выберите агента</option>
            {delegatedAgentId && !eligibleAgents.some((item) => item.id === delegatedAgentId) && (
              <option value={delegatedAgentId} disabled>{currentAgent?.name ?? "Прежний агент"} · недоступен</option>
            )}
            {eligibleAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {agentDelegatable && eligibleAgents.length === 0 && (
        <small>Нет агентов с доступом к выбранному проекту.</small>
      )}
    </section>
  );
}
