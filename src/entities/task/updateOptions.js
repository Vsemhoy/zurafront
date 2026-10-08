export function taskUpdateOptions(client, updateTask) {
  return {
    mutationFn: async ({ scopeId, taskId, payload }) => {
      const updated = await updateTask(scopeId, taskId, payload);
      if (updated.id !== taskId) throw new Error('Ответ сохранения относится к другой задаче. Обновите страницу.');
      return updated;
    },
    onSuccess: (updated, { scopeId, taskId }) => {
      client.setQueryData(['task', scopeId, taskId], updated);
      client.invalidateQueries({ queryKey: ['tasks', scopeId] });
      client.invalidateQueries({ queryKey: ['task-activity', scopeId, taskId] });
    },
  };
}
