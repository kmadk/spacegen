'use strict';

var fs = require('fs');
var crypto = require('crypto');
var Ajv = require('ajv');
var addFormats = require('ajv-formats');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var fs__default = /*#__PURE__*/_interopDefault(fs);
var crypto__default = /*#__PURE__*/_interopDefault(crypto);
var Ajv__default = /*#__PURE__*/_interopDefault(Ajv);
var addFormats__default = /*#__PURE__*/_interopDefault(addFormats);

// src/index.ts
function loadIR(path) {
  const raw = fs__default.default.readFileSync(path, "utf8");
  return JSON.parse(raw);
}
function saveIR(path, obj) {
  const data = JSON.stringify(obj, null, 2);
  fs__default.default.writeFileSync(path, data, "utf8");
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
  const h = crypto__default.default.createHash("sha256");
  h.update(canonicalJsonString(obj));
  return h.digest("hex");
}
function validateIR(obj, schema) {
  const ajv = new Ajv__default.default({ allErrors: true, strict: false });
  addFormats__default.default(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(obj);
  if (!ok) {
    const errors = (validate.errors || []).map((e) => `${e.instancePath} ${e.message}`);
    return { ok, errors };
  }
  return { ok: true };
}

exports.canonicalJsonString = canonicalJsonString;
exports.canonicalize = canonicalize;
exports.irHash = irHash;
exports.loadIR = loadIR;
exports.saveIR = saveIR;
exports.validateIR = validateIR;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.cjs.map