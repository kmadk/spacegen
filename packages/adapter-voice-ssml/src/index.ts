
import type { SemanticTree } from '@fir/runtime-core';

export function renderToVoice(tree: SemanticTree): string {
  const parts: string[] = [];
  parts.push(`App view. Level ${tree.level}.`);
  for (const c of tree.children) {
    if (c.type === 'summary') parts.push(`Summary: ${c.summary}`);
    else parts.push(`Node: ${c.type}${c.id ? ' ('+c.id+')' : ''}`);
  }
  return parts.join(' ');
}
