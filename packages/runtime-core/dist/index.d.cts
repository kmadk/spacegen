import { Json } from '@fir/ir';

declare function deriveSemanticLevel(scale: number): number;
type SemanticNode = {
    id?: string;
    type: string;
    children?: SemanticNode[];
    summary?: string;
    renderHints?: any;
    metadata?: any;
};
type SemanticTree = {
    type: "app";
    level: number;
    children: SemanticNode[];
};
declare function buildSemanticTree(ir: Json, opts?: {
    scale?: number;
}): SemanticTree;

export { type SemanticNode, type SemanticTree, buildSemanticTree, deriveSemanticLevel };
