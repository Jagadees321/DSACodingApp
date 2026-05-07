import { useMemo } from "react";

// Lightweight syntax highlighter for Java/Python.
// Tokenizes line-by-line and returns React-friendly HTML.

const JAVA_KEYWORDS = new Set([
  "class", "public", "private", "protected", "static", "void", "int", "long",
  "double", "float", "boolean", "char", "String", "return", "if", "else", "for",
  "while", "do", "new", "true", "false", "null", "import", "package", "this",
  "extends", "implements", "interface", "abstract", "final", "throws", "throw",
  "try", "catch", "finally", "switch", "case", "break", "continue", "default",
]);

const PY_KEYWORDS = new Set([
  "def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or",
  "True", "False", "None", "import", "from", "as", "class", "self", "pass",
  "break", "continue", "lambda", "with", "try", "except", "finally", "raise",
  "yield", "global", "nonlocal", "is",
]);

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightLine(line: string, lang: "java" | "python"): string {
  const keywords = lang === "java" ? JAVA_KEYWORDS : PY_KEYWORDS;
  const commentChar = lang === "java" ? "//" : "#";
  const ci = line.indexOf(commentChar);
  if (ci !== -1) {
    const before = line.slice(0, ci);
    const after = line.slice(ci);
    return highlightLine(before, lang) + `<span style="color:var(--editor-comment)">${escape(after)}</span>`;
  }

  // strings
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== c) {
        if (line[j] === "\\") j++;
        j++;
      }
      out.push(`<span style="color:var(--editor-string)">${escape(line.slice(i, j + 1))}</span>`);
      i = j + 1;
      continue;
    }
    // number
    if (/\d/.test(c)) {
      let j = i;
      while (j < line.length && /[\d.]/.test(line[j])) j++;
      out.push(`<span style="color:var(--editor-number)">${escape(line.slice(i, j))}</span>`);
      i = j;
      continue;
    }
    // word
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (keywords.has(word)) {
        out.push(`<span style="color:var(--editor-keyword);font-weight:600">${escape(word)}</span>`);
      } else if (line[j] === "(") {
        out.push(`<span style="color:var(--editor-fn)">${escape(word)}</span>`);
      } else {
        out.push(escape(word));
      }
      i = j;
      continue;
    }
    out.push(escape(c));
    i++;
  }
  return out.join("");
}

export function CodeEditor({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (v: string) => void;
  language: "java" | "python";
}) {
  const lines = value.split("\n");
  const highlighted = useMemo(
    () => lines.map((l) => highlightLine(l || " ", language)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, language],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const v = ta.value;
      const nv = v.slice(0, s) + "  " + v.slice(ta.selectionEnd);
      onChange(nv);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 2;
      });
    }
  };

  return (
    <div
      className="relative flex font-mono text-[13px] leading-6 rounded-lg overflow-hidden border border-border"
      style={{ background: "var(--editor-bg)" }}
    >
      <div
        className="flex-shrink-0 select-none px-3 py-3 text-right"
        style={{ color: "var(--editor-line)", background: "color-mix(in oklab, var(--editor-bg) 80%, black)" }}
      >
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="relative flex-1 overflow-auto">
        <pre
          aria-hidden
          className="m-0 px-3 py-3 whitespace-pre pointer-events-none min-h-full"
          style={{ color: "var(--coding-pane-fg, var(--foreground))" }}
          dangerouslySetInnerHTML={{ __html: highlighted.join("\n") }}
        />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="absolute inset-0 w-full h-full px-3 py-3 bg-transparent text-transparent caret-primary resize-none focus:outline-none whitespace-pre font-mono text-[13px] leading-6"
          style={{ caretColor: "var(--neon-cyan)" }}
        />
      </div>
    </div>
  );
}
