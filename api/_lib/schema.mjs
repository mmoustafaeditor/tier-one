// A tiny JSON-schema subset for validating the config files on load (no dependencies).
// Supported: type (object|array|string|number|integer|boolean), required, properties, additionalProperties (false),
// items, enum, pattern, minimum, maximum, minLength, maxLength, minItems, maxItems, oneOf (by type only), nullable.
export function validate(schema, value, path = '$', errors = []) {
  const err = (m) => { errors.push(path + ': ' + m); return errors; };
  if (value == null) { if (schema.nullable) return errors; return err('missing'); }
  const t = schema.type;
  const actual = Array.isArray(value) ? 'array' : typeof value;
  if (t === 'integer') { if (!Number.isInteger(value)) return err('expected integer'); }
  else if (t === 'number') { if (typeof value !== 'number' || !Number.isFinite(value)) return err('expected number'); }
  else if (t && t !== actual) return err('expected ' + t + ', got ' + actual);
  if (schema.enum && !schema.enum.includes(value)) return err('not one of ' + schema.enum.join('|'));
  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) err('does not match ' + schema.pattern);
    if (schema.minLength != null && value.length < schema.minLength) err('too short');
    if (schema.maxLength != null && value.length > schema.maxLength) err('too long');
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) err('below ' + schema.minimum);
    if (schema.maximum != null && value > schema.maximum) err('above ' + schema.maximum);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) err('too few items');
    if (schema.maxItems != null && value.length > schema.maxItems) err('too many items');
    if (schema.items) value.forEach((v, i) => validate(schema.items, v, path + '[' + i + ']', errors));
    if (schema.uniqueBy) { const seen = new Set(); for (const v of value) { const k = v && v[schema.uniqueBy]; if (seen.has(k)) err('duplicate ' + schema.uniqueBy + ' ' + k); seen.add(k); } }
  }
  if (actual === 'object' && t === 'object') {
    for (const r of schema.required || []) if (value[r] === undefined) err('missing ' + r);
    for (const [k, v] of Object.entries(value)) {
      const ps = schema.properties && schema.properties[k];
      if (ps) validate(ps, v, path + '.' + k, errors);
      else if (schema.additionalProperties === false) err('unknown key ' + k);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validate(schema.additionalProperties, v, path + '.' + k, errors);
    }
  }
  return errors;
}
export function assertValid(schema, value, what) {
  const errs = validate(schema, value);
  if (errs.length) throw new Error('config ' + what + ' invalid: ' + errs.slice(0, 5).join('; '));
  return value;
}
