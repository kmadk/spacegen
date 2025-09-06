type Camera = {
    scale: number;
    x: number;
    y: number;
};
type SemanticNode = {
    id?: string;
    type: string;
    children?: SemanticNode[];
    summary?: string;
    renderHints?: any;
    metadata?: any;
};
declare function renderToDom(tree: any, mountEl: HTMLElement, camera?: Camera): void;

export { type Camera, type SemanticNode, renderToDom };
