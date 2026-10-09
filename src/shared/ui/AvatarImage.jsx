import { useState } from 'react';
import { FileImage } from './PhotoPanel';
import { PresetAvatarImage } from './PresetAvatarImage';
import './AvatarPicker.css';

export function AvatarImage({ avatar, name = '', className = '', original = false, size = 48 }) {
  const [failedPreset, setFailedPreset] = useState(null);
  const crop = avatar?.crop ?? { x: 50, y: 50, zoom: 1 };
  const style = { objectPosition: `${crop.x}% ${crop.y}%`, transformOrigin: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})` };
  const preset = /^Anima_\d{5}_\.png$/.test(avatar?.preset ?? '') ? avatar.preset : null;
  return <span className={`avatar-image ${className}`}>
    {preset && failedPreset !== preset
      ? <PresetAvatarImage preset={preset} original={original} size={size} zoom={crop.zoom} alt={name} style={style} onError={() => setFailedPreset(preset)}/>
      : avatar?.file_id
        ? <FileImage scopeId={avatar.scope_id} fileId={avatar.file_id} alt={name} style={style}/>
        : <span className="avatar-initials">{name.trim().slice(0, 2).toUpperCase() || '?'}</span>}
  </span>;
}
