import fs from 'fs';
import crypto from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// src/index.ts
function loadIR(path) {
  const raw = fs.readFileSync(path, "utf8");
  return JSON.parse(raw);
}
function saveIR(path, obj) {
  const data = JSON.stringify(obj, null, 2);
  fs.writeFileSync(path, data, "utf8");
}
function canonicalize(obj) {
  if (Array.isArray(obj)) return obj.map(canonicalize);
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const res = {};
    for (const k of keys) res[k] = canonicalize(obj[k]);
    return res;
  }
  return obj;
}
function canonicalJsonString(obj) {
  return JSON.stringify(canonicalize(obj));
}
function irHash(obj) {
  const h = crypto.createHash("sha256");
  h.update(canonicalJsonString(obj));
  return h.digest("hex");
}
function validateIR(obj, schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(obj);
  if (!ok) {
    const errors = (validate.errors || []).map((e) => `${e.instancePath} ${e.message}`);
    return { ok, errors };
  }
  return { ok: true };
}

export { canonicalJsonString, canonicalize, irHash, loadIR, saveIR, validateIR };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map