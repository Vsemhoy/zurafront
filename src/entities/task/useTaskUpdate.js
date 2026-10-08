import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from './api';
import { taskUpdateOptions } from './updateOptions';

export function useTaskUpdate(scopeId, taskId) {
  const client = useQueryClient();
  const mutation = useMutation({
    ...taskUpdateOptions(client, taskApi.update),
    scope: { id: `task-update:${scopeId}:${taskId}` },
  });
  return {
    ...mutation,
    mutate: (payload, options) => mutation.mutate({ scopeId, taskId, payload: { ...payload } }, options),
    mutateAsync: (payload, options) => mutation.mutateAsync({ scopeId, taskId, payload: { ...payload } }, options),
  };
}
