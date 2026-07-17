// Resolves `{{field_key}}` references against a value context, then evaluates
// the result as arithmetic — powers "Calculate" actions (see engine.ts's
// resolveActionValue). Deliberately a small hand-rolled recursive-descent
// parser (+ - * / % and parentheses only) rather than `eval`/`new Function`,
// so rule content authored by any user can never execute arbitrary code.

export type ExpressionContext = Record<string, string | number | boolean | (string | number | boolean)[] | undefined>;

export interface ExpressionResult {
  value: string | number;
  error?: string;
}

const VAR_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Every `{{field_key}}` token referenced in an expression, in source order. */
export function extractVariableKeys(expr: string): string[] {
  const keys: string[] = [];
  const re = new RegExp(VAR_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(expr)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

/** Keys in `expr` that are not present in `availableKeys`. */
export function findUnknownVariableKeys(expr: string, availableKeys: Set<string>): string[] {
  const unknown: string[] = [];
  for (const key of extractVariableKeys(expr)) {
    if (!availableKeys.has(key) && !unknown.includes(key)) unknown.push(key);
  }
  return unknown;
}

export interface ExpressionPreview {
  /** Human-readable substituted form, e.g. `500,000 × 0.05`. */
  substituted: string;
  result: ExpressionResult;
}

/** Builds a live preview by substituting context values into the expression. */
export function previewExpression(expr: string, context: ExpressionContext): ExpressionPreview {
  const trimmed = expr.trim();
  if (!trimmed) return { substituted: "", result: { value: "" } };

  const substituted = trimmed.replace(VAR_PATTERN, (_match, key: string) => {
    const raw = context[key];
    if (raw === undefined || Array.isArray(raw)) return `{{${key}}}`;
    const n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (Number.isNaN(n)) return String(raw);
    return formatPreviewNumber(n);
  });

  const result = evaluateExpression(trimmed, context);
  return { substituted: substituted.replace(/\*/g, "×").replace(/\//g, "÷"), result };
}

function formatPreviewNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function evaluateExpression(expr: string, context: ExpressionContext): ExpressionResult {
  const trimmed = expr.trim();
  if (!trimmed) return { value: "" };

  const hasVars = new RegExp(VAR_PATTERN.source).test(trimmed);
  if (!hasVars) {
    // No {{...}} references — preserve the pre-existing literal behavior:
    // a purely numeric string becomes a number, anything else stays a string.
    return /^-?[0-9]+(\.[0-9]+)?$/.test(trimmed) ? { value: parseFloat(trimmed) } : { value: trimmed };
  }

  let missingKey: string | undefined;
  const substituted = trimmed.replace(VAR_PATTERN, (_match, key: string) => {
    const raw = context[key];
    if (raw === undefined || Array.isArray(raw)) {
      missingKey = key;
      return "0";
    }
    const n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (Number.isNaN(n)) {
      missingKey = key;
      return "0";
    }
    return `(${n})`;
  });
  if (missingKey) {
    return { value: trimmed, error: `Unknown or non-numeric field "${missingKey}"` };
  }

  try {
    return { value: evaluateArithmetic(substituted) };
  } catch (e) {
    return { value: trimmed, error: e instanceof Error ? e.message : "Invalid expression" };
  }
}

// Grammar: expr := term (('+' | '-') term)*
//          term := factor (('*' | '/' | '%') factor)*
//          factor := ('+' | '-') factor | '(' expr ')' | number
function evaluateArithmetic(source: string): number {
  const s = source.replace(/\s+/g, "");
  let i = 0;

  const peek = () => s[i];
  const fail = (msg: string): never => {
    throw new Error(msg);
  };

  function parseExpr(): number {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = s[i++];
      const rhs = parseFactor();
      if ((op === "/" || op === "%") && rhs === 0) fail("Division by zero");
      value = op === "*" ? value * rhs : op === "/" ? value / rhs : value % rhs;
    }
    return value;
  }

  function parseFactor(): number {
    if (peek() === "+") {
      i++;
      return parseFactor();
    }
    if (peek() === "-") {
      i++;
      return -parseFactor();
    }
    if (peek() === "(") {
      i++;
      const value = parseExpr();
      if (peek() !== ")") fail("Expected \")\"");
      i++;
      return value;
    }
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    if (start === i) fail(`Unexpected character "${s[i] ?? ""}"`);
    const num = parseFloat(s.slice(start, i));
    if (Number.isNaN(num)) fail("Invalid number");
    return num;
  }

  if (s.length === 0) fail("Empty expression");
  const result = parseExpr();
  if (i !== s.length) fail(`Unexpected trailing input "${s.slice(i)}"`);
  return result;
}
