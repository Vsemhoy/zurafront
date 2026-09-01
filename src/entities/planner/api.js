import { apiRequest } from '../../api';

function queryString(filters) {
    const params = new URLSearchParams({ from: filters.from, to: filters.to });
    for (const id of filters.projectIds ?? []) params.append('project_ids[]', id);
    for (const id of filters.assigneeIds ?? []) params.append('assignee_ids[]', id);
    for (const status of filters.statuses ?? []) params.append('statuses[]', status);
    return params.toString();
}

export const plannerApi = {
    async range(scopeId, filters) {
        return (await apiRequest(`/scopes/${scopeId}/planner?${queryString(filters)}`)).data;
    },
    async createTail(scopeId, taskId, plannedOn) {
        return (await apiRequest(`/scopes/${scopeId}/planner/tails`, { method: 'POST', body: JSON.stringify({ task_id: taskId, planned_on: plannedOn }) })).data;
    },
    async moveTail(scopeId, tailId, plannedOn) {
        return (await apiRequest(`/scopes/${scopeId}/planner/tails/${tailId}`, { method: 'PATCH', body: JSON.stringify({ planned_on: plannedOn }) })).data;
    },
    async copyTask(scopeId, taskId, plannedOn) {
        return (await apiRequest(`/scopes/${scopeId}/planner/tasks/${taskId}/copy`, { method: 'POST', body: JSON.stringify({ planned_on: plannedOn }) })).data;
    },
    async bulk(scopeId, payload) {
        return (await apiRequest(`/scopes/${scopeId}/planner/tasks/bulk`, { method: 'PATCH', body: JSON.stringify(payload) })).data;
    },
};
