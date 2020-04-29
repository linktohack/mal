import { Atom, MalType, Tokenized } from "./types";

function makeEOFError(expected: Tokenized) {
  return new Error(`reach EOF before reading a '${expected}' `);
}

class Reader {
  current = 0;

  constructor(public tokens: Tokenized[]) {}

  peek() {
    return this.tokens[this.current];
  }

  next() {
    const peeked = this.peek();
    this.current = this.current + 1;
    return peeked;
  }
}

export function read_str(str: string): MalType {
  const tokens = tokenize(str);
  const reader = new Reader(tokens);
  return read_form(reader);
}

function tokenize(str: string): Tokenized[] {
  const re = /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"?|;.*|[^\s\[\]{}('"`,;)]+)/g;
  const matched = str.matchAll(re);
  return [...matched].map((it) => it[1]);
}

function read_form(reader: Reader): MalType {
  let current = reader.peek();
  if (current === "(") {
    return { type: "list", list: read_list(reader, ")") };
  } else if (current === "[") {
    return { type: "vector", list: read_list(reader, "]") };
  } else if (current === "{") {
    return { type: "hash-map", list: read_list(reader, "}") };
  } else {
    const atom = read_atom(reader);
    if (atom.type === "symbol") {
      let symbol: string | undefined =
        atom.symbol === "'"
          ? "quote"
          : atom.symbol === "`"
          ? "quasiquote"
          : atom.symbol === "`"
          ? "quasiquote"
          : atom.symbol === "~"
          ? "unquote"
          : atom.symbol === "~@"
          ? "splice-unquote"
          : atom.symbol === "@"
          ? "deref"
          : atom.symbol === "^"
          ? "with-meta"
          : undefined;

      if (symbol === "with-meta") {
        const f1 = read_form(reader);
        const f2 = read_form(reader);

        return {
          type: "list",
          list: [{ type: "atom", atom: { type: "symbol", symbol } }, f2, f1],
        };
      } else if (symbol) {
        return {
          type: "list",
          list: [
            { type: "atom", atom: { type: "symbol", symbol } },
            read_form(reader),
          ],
        };
      } else {
        return { type: "atom", atom };
      }
    }
    return { type: "atom", atom };
  }
}

function read_list(reader: Reader, expected_end_token: Tokenized): MalType[] {
  let list: MalType[] = [];
  let _ = reader.next();

  let current = reader.peek();
  while (current) {
    if (current === expected_end_token) {
      let _ = reader.next();
      break;
    } else {
      list = list.concat(read_form(reader));
      current = reader.peek();
    }
  }

  if (current !== expected_end_token) {
    throw makeEOFError(expected_end_token);
  }

  return list;
}

function read_atom(reader: Reader): Atom {
  const atom = reader.next();
  if (atom === "true" || atom === "false" || atom === "nil") {
    return { type: atom };
  }

  const number = parseFloat(atom);
  if (!isNaN(number)) {
    return { type: "number", number };
  }

  if (atom.startsWith('"')) {
    try {
      const parsed = JSON.parse(atom); // FIXME (QL): Too lazy
      if (typeof parsed === "string") {
        return { type: "string", string: parsed };
      }
    } catch {
      throw makeEOFError('"');
    }
  }

  if (atom.startsWith(":")) {
    return { type: "keyword", keyword: atom };
  }

  return { type: "symbol", symbol: atom };
}
