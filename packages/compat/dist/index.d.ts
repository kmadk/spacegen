import { Json } from '@fir/ir';

type LintMessage = {
    level: 'WARN' | 'ERROR';
    path: string;
    message: string;
};
type LintResult = {
    messages: LintMessage[];
    dci: number;
};
declare function lintCompat(ir: Json): LintResult;

export { type LintMessage, type LintResult, lintCompat };
