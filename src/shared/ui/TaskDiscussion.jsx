import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconCornerUpLeft, IconTrash, IconX } from '@tabler/icons-react';
import { useAuth } from '../../auth';
import { taskApi } from '../../entities/task/api';
import { rootComment, threadedComments } from '../../entities/task/comments';
import { AvatarImage } from './AvatarImage';
import './TaskDiscussion.css';

const kindLabels = { comment: 'Комментарий', question: 'Вопрос', answer: 'Ответ' };

export function TaskDiscussion({ scope, task }) {
  const user = useAuth((state) => state.user);
  const client = useQueryClient();
  const [content, setContent] = useState('');
  const [kind, setKind] = useState('comment');
  const [replyTo, setReplyTo] = useState(null);
  const input = useRef(null);
  const commentsKey = ['task-comments', scope.id, task.id];
  const query = useQuery({ queryKey: commentsKey, queryFn: () => taskApi.comments(scope.id, task.id) });
  const comments = query.data ?? [];
  const readOnly = task.status === 'cancelled';
  const refresh = () => {
    client.invalidateQueries({ queryKey: commentsKey });
    client.invalidateQueries({ queryKey: ['tasks', scope.id] });
    client.invalidateQueries({ queryKey: ['task', scope.id, task.id] });
    client.invalidateQueries({ queryKey: ['task-activity', scope.id, task.id] });
  };
  const send = useMutation({
    mutationFn: (payload) => taskApi.createComment(scope.id, task.id, payload.content, payload.parent_id, payload.kind),
    onSuccess: () => { setContent(''); setReplyTo(null); setKind('comment'); refresh(); },
  });
  const remove = useMutation({ mutationFn: (id) => taskApi.deleteComment(scope.id, task.id, id), onSuccess: (_, id) => { if (replyTo?.id === id) { setReplyTo(null); setKind('comment'); } refresh(); } });
  const answer = useMutation({ mutationFn: ({ id, is_answered }) => taskApi.updateComment(scope.id, task.id, id, { is_answered }), onSuccess: refresh });
  const mayManage = (comment) => comment.created_by?.id === user?.id || task.created_by === user?.id || scope.owner_id === user?.id;
  const reply = (comment) => {
    const root = rootComment(comment, comments);
    setReplyTo(root);
    setKind(root.kind === 'question' ? 'answer' : 'comment');
    input.current?.focus();
  };
  return <div className="task-discussion">
    <div className="task-discussion-list">
      {query.isPending && <p>Загружаю комментарии…</p>}
      {query.error && <p role="alert">{query.error.message}</p>}
      {threadedComments(comments).map((comment) => <article key={comment.id} className={`task-discussion-comment ${comment.parent_id ? 'is-reply' : ''}`}>
        <AvatarImage avatar={comment.created_by?.avatar} name={comment.created_by?.name ?? 'Неизвестный автор'} className="task-comment-avatar" size={28}/>
        <div>
          <header><strong>{comment.created_by?.name ?? 'Неизвестный автор'}</strong><time>{new Date(comment.created_at).toLocaleString('ru-RU')}</time></header>
          <span className={`task-comment-kind task-comment-kind--${comment.kind ?? 'comment'} ${comment.is_answered ? 'is-answered' : ''}`}>{kindLabels[comment.kind] ?? 'Комментарий'}{comment.kind === 'question' ? comment.is_answered ? ' · Отвечен' : ' · Ждёт ответа' : ''}</span>
          <p>{comment.content}</p>
          {!readOnly && <footer>
            <button type="button" onClick={() => reply(comment)}><IconCornerUpLeft size={13}/>Ответить</button>
            {comment.kind === 'question' && mayManage(comment) && <button type="button" disabled={answer.isPending} onClick={() => answer.mutate({ id: comment.id, is_answered: !comment.is_answered })}>{comment.is_answered ? 'Снова вопрос' : 'Отметить отвеченным'}</button>}
            {mayManage(comment) && <button type="button" className="delete" disabled={remove.isPending} onClick={() => window.confirm(comment.parent_id ? 'Удалить комментарий?' : 'Удалить комментарий и ответы на него?') && remove.mutate(comment.id)}><IconTrash size={13}/>Удалить</button>}
          </footer>}
        </div>
      </article>)}
      {!query.isPending && !query.error && !comments.length && <p>Комментариев пока нет.</p>}
    </div>
    {readOnly ? <p className="task-discussion-readonly">Восстановите задачу, чтобы продолжить обсуждение.</p> : <form className="task-discussion-compose" onSubmit={(event) => { event.preventDefault(); if (content.trim()) send.mutate({ content: content.trim(), parent_id: replyTo?.id ?? null, kind }); }}>
      {replyTo && <div className="task-discussion-reply"><span>Ответ для {replyTo.created_by?.name ?? 'автора'}: {replyTo.content.slice(0, 100)}</span><button type="button" onClick={() => { setReplyTo(null); setKind('comment'); }} aria-label="Отменить ответ"><IconX size={14}/></button></div>}
      <label>Тип<select value={kind} onChange={(event) => setKind(event.target.value)} disabled={send.isPending}><option value="comment">Комментарий</option>{!replyTo && <option value="question">Вопрос</option>}{replyTo?.kind === 'question' && <option value="answer">Ответ</option>}</select></label>
      <textarea ref={input} rows={3} value={content} disabled={send.isPending} onChange={(event) => setContent(event.target.value)} placeholder={kind === 'question' ? 'Задайте вопрос…' : kind === 'answer' ? 'Ответьте на вопрос…' : 'Написать комментарий…'} aria-label="Текст комментария"/>
      <button type="submit" disabled={!content.trim() || send.isPending}>{send.isPending ? 'Отправляю…' : 'Отправить'}</button>
    </form>}
    {(send.error || remove.error || answer.error) && <p role="alert" className="form-error">{send.error?.message ?? remove.error?.message ?? answer.error?.message}</p>}
  </div>;
}
