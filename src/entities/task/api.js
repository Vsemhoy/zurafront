import { apiRequest } from "../../api";
export const taskApi = {
  async list(scopeId) {
    return (await apiRequest(`/scopes/${scopeId}/tasks`)).data;
  },
  async get(scopeId, taskId) {
    return (await apiRequest(`/scopes/${scopeId}/tasks/${taskId}`)).data;
  },
  async create(scopeId, payload) {
    return (
      await apiRequest(`/scopes/${scopeId}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).data;
  },
  async update(scopeId, taskId, payload) {
    return (
      await apiRequest(`/scopes/${scopeId}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    ).data;
  },
  remove(scopeId, taskId) {
    return apiRequest(`/scopes/${scopeId}/tasks/${taskId}`, { method: "DELETE" });
  },
  async move(scopeId, taskId, status, targetIndex) {
    return (
      await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ status, target_index: targetIndex }),
      })
    ).data;
  },
  async checklist(scopeId, taskId) {
    return (await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/checklist`))
      .data;
  },
  async createChecklistItem(scopeId, taskId, title) {
    return (
      await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ title }),
      })
    ).data;
  },
  async setChecklistItemCompleted(scopeId, taskId, itemId, isCompleted) {
    return (
      await apiRequest(
        `/scopes/${scopeId}/tasks/${taskId}/checklist/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_completed: isCompleted }),
        },
      )
    ).data;
  },
  async convertChecklistItem(scopeId, taskId, itemId) {
    return (
      await apiRequest(
        `/scopes/${scopeId}/tasks/${taskId}/checklist/${itemId}/convert-to-subtask`,
        { method: "POST", body: "{}" },
      )
    ).data;
  },
  async detach(scopeId, taskId) {
    return (
      await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/detach`, {
        method: "POST",
        body: "{}",
      })
    ).data;
  },
  async search(scopeId, query) {
    return (
      await apiRequest(
        `/scopes/${scopeId}/tasks/search?q=${encodeURIComponent(query)}`,
      )
    ).data;
  },
  async relations(scopeId, taskId) {
    return (await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/relations`))
      .data;
  },
  async createRelation(scopeId, taskId, taskKey, relation) {
    return (
      await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/relations`, {
        method: "POST",
        body: JSON.stringify({ task_key: taskKey, relation }),
      })
    ).data;
  },
  async deleteRelation(scopeId, taskId, linkId) {
    return apiRequest(
      `/scopes/${scopeId}/tasks/${taskId}/relations/${linkId}`,
      { method: "DELETE" },
    );
  },
  async comments(scopeId, taskId) {
    return (await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/comments`))
      .data;
  },
  async createComment(scopeId, taskId, content, parentId = null) {
    return (
      await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parent_id: parentId }),
      })
    ).data;
  },
  async activity(scopeId, taskId) {
    return (await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/activity`))
      .data;
  },
  async blockers(scopeId, taskId) {
    return (await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/blockers`))
      .data;
  },
  async createBlocker(scopeId, taskId, payload) {
    return (
      await apiRequest(`/scopes/${scopeId}/tasks/${taskId}/blockers`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).data;
  },
  async resolveBlocker(scopeId, taskId, blockerId, resolutionNote) {
    return (
      await apiRequest(
        `/scopes/${scopeId}/tasks/${taskId}/blockers/${blockerId}/resolve`,
        {
          method: "PATCH",
          body: JSON.stringify({ resolution_note: resolutionNote }),
        },
      )
    ).data;
  },
};
