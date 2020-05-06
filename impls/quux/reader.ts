import {
  Atom,
  makeHashMap,
  makeList,
  makeSymbol,
  makeVector,
  MalType,
  Tokenized,
} from "./types";

function makeEOFError(expected: Tokenized) {
  return new Error(`reach EOF before reading a '${expected}' `);
}

class Reader {
  current = 0;

  constructor(public tokens: Tokenized[]) {}

  peek() {
    return this.tokens[this.current];
  }

  next(): string | undefined {
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
  while (current && current.startsWith(";")) {
    // Skip comment for the moment
    let _ = reader.next();
    current = reader.peek();
  }
  if (current === "(") {
    return makeList(...read_list(reader, ")"));
  } else if (current === "[") {
    return makeVector(...read_list(reader, "]"));
  } else if (current === "{") {
    return makeHashMap(...read_list(reader, "}"));
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
        return makeList(makeSymbol(symbol), f2, f1);
      } else if (symbol) {
        return makeList(makeSymbol(symbol), read_form(reader));
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
  if (!atom) {
    return { type: "nil" };
  }

  if (atom === "true" || atom === "false" || atom === "nil") {
    return { type: atom };
  }

  const number = parseFloat(atom);
  if (!isNaN(number)) {
    return { type: "number", number };
  }

  if (atom.startsWith('"')) {
    if (atom.length < 2 || !atom.endsWith('"')) {
      throw makeEOFError('"');
    }

    let parsed = "";
    let i = 1;
    while (i < atom.length - 1) {
      if (atom[i] === "\\") {
        if (i === atom.length - 2) {
          throw new Error("Trailing escape");
        }
        switch (atom[i + 1]) {
          case "\\":
            parsed = parsed + "\\";
            break;
          case '"':
            parsed = parsed + '"';
            break;
          case "n":
            parsed = parsed + "\n";
            break;
          default:
            throw new Error("Unknown escape: \\" + atom[i + 1]);
        }
        i = i + 2;
      } else {
        parsed = parsed + atom[i];
        i = i + 1;
      }
    }
    return { type: "string", string: parsed };
  }

  if (atom.startsWith(":")) {
    return { type: "keyword", keyword: atom };
  }

  return { type: "symbol", symbol: atom };
}
