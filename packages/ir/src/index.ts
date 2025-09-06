
import fs from 'node:fs';
import crypto from 'node:crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export type Json = any;

export function loadIR(path: string): Json {
  const raw = fs.readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

export function saveIR(path: string, obj: Json) {
  const data = JSON.stringify(obj, null, 2);
  fs.writeFileSync(path, data, 'utf8');
}

export function canonicalize(obj: Json): Json {
  if (Array.isArray(obj)) return obj.map(canonicalize);
  if (obj && typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const res: any = {};
    for (const k of keys) res[k] = canonicalize(obj[k]);
    return res;
  }
  return obj;
}

export function canonicalJsonString(obj: Json): string {
  return JSON.stringify(canonicalize(obj));
}

export function irHash(obj: Json): string {
  const h = crypto.createHash('sha256');
  h.update(canonicalJsonString(obj));
  return h.digest('hex');
}

export function validateIR(obj: Json, schema: Json): { ok: boolean; errors?: string[] } {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(obj) as boolean;
  if (!ok) {
    const errors = (validate.errors || []).map(e => `${e.instancePath} ${e.message}`);
    return { ok, errors };
  }
  return { ok: true };
}
