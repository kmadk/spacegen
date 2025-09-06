
import type { Json } from '@fir/ir';

const ALLOWED_KINDS = new Set([
  'ui.frame','ui.table','ui.chart','ui.summary','policy.role','action.query','action.mutate','action.call_http'
]);

export type LintMessage = { level: 'WARN'|'ERROR'; path: string; message: string };
export type LintResult = { messages: LintMessage[]; dci: number };

export function lintCompat(ir: Json): LintResult {
  const messages: LintMessage[] = [];
  const uiNodes = (ir.ui?.nodes ?? []) as any[];
  let portable = 0;
  for (let i=0;i<uiNodes.length;i++) {
    const n = uiNodes[i];
    if (ALLOWED_KINDS.has(n.kind)) portable++;
    else messages.push({ level: 'WARN', path: `/ui/nodes/${i}`, message: `kind '${n.kind}' not in portable subset` });
  }
  const total = uiNodes.length || 1;
  const dci = Math.round((portable/total)*100);
  if (ir.meta?.strictMode) {
    for (const m of messages) m.level = 'ERROR';
  }
  return { messages, dci };
}
