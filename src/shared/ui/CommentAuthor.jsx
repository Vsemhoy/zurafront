import { AvatarImage } from './AvatarImage';
import './CommentAuthor.css';

export function CommentAuthor({ author }) {
  const name = author?.name || 'Неизвестный автор';
  return <span className="comment-author">
    <AvatarImage avatar={author?.avatar} name={name} className="comment-avatar"/>
    <strong>{name}</strong>
  </span>;
}
