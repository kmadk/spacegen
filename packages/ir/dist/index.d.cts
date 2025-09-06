type Json = any;
declare function loadIR(path: string): Json;
declare function saveIR(path: string, obj: Json): void;
declare function canonicalize(obj: Json): Json;
declare function canonicalJsonString(obj: Json): string;
declare function irHash(obj: Json): string;
declare function validateIR(obj: Json, schema: Json): {
    ok: boolean;
    errors?: string[];
};

export { type Json, canonicalJsonString, canonicalize, irHash, loadIR, saveIR, validateIR };
