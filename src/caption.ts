import {HASHTAGS} from './config';
import {Part, partLabel} from './parts';

export function buildCaption(p: Part) {
  const lines = p.verses
    .slice(0, 3)
    .map(v => `${v.ayahNumber}. ${v.translation}`)
    .join('\n');
  const more = p.verses.length > 3 ? '\n...' : '';
  return [partLabel(p), '', lines + more, '', HASHTAGS.join(' ')].join('\n');
}
