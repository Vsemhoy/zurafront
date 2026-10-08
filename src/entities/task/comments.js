export function commentIndicator(task) {
  if (Number(task.unanswered_questions_count ?? 0) > 0) return 'question';
  return Number(task.comments_count ?? 0) > 0 ? 'comments' : 'empty';
}

export function rootComment(comment, comments) {
  const byId = new Map(comments.map((item) => [item.id, item]));
  const visited = new Set();
  let current = comment;
  while (current.parent_id && byId.has(current.parent_id) && !visited.has(current.id)) {
    visited.add(current.id);
    current = byId.get(current.parent_id);
  }
  return current;
}

export function threadedComments(comments) {
  const roots = [];
  const replies = new Map();
  for (const comment of comments) {
    const root = rootComment(comment, comments);
    if (root.id === comment.id) roots.push(comment);
    else replies.set(root.id, [...(replies.get(root.id) ?? []), comment]);
  }
  return roots.flatMap((root) => [root, ...(replies.get(root.id) ?? [])]);
}
