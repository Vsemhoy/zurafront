import { useState } from 'react';
import variants from '../../generated/avatar-variants.json';

export function PresetAvatarImage({ preset, original = false, size = 48, zoom = 1, onError, ...props }) {
  const [failedVariant, setFailedVariant] = useState(null);
  const thumbnails = !original && failedVariant !== preset ? variants[preset] : null;
  return <img {...props}
    src={thumbnails?.[96] ?? `/avatars/${preset}`}
    srcSet={thumbnails ? `${thumbnails[96]} 96w, ${thumbnails[192]} 192w` : undefined}
    sizes={thumbnails ? `${Math.min(192, Math.ceil(size * zoom))}px` : undefined}
    decoding="async"
    onError={(event) => {
      if (thumbnails) setFailedVariant(preset);
      else onError?.(event);
    }}/>;
}
