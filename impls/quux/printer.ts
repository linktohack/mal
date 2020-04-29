import { MalType } from "./reader";

export function assertNever(x: never) {
  return new Error(`epecting x to be never: ${x}`);
}

export function pr_str(ast: MalType, print_readably = true): string {
  if (ast.type === "atom") {
    const atom = ast.atom;
    if (atom.type === "true" || atom.type === "false" || atom.type === "nil") {
      return atom.type;
    }
    if (
      atom.type === "number" ||
      atom.type === "keyword" ||
      atom.type === "symbol"
    ) {
      return (ast.atom as any)[atom.type];
    }

    if (atom.type === "string") {
      if (print_readably) {
        return (
          '"' +
          atom.string
            .split("\\")
            .join("\\\\")
            .split('"')
            .join('\\"')
            .split("\n")
            .join("\\n") +
          '"'
        );
      } else {
        return '"' + atom.string + '"';
      }
    }

    throw assertNever(atom);
  }

  if (ast.type === "list") {
    return (
      "(" + ast.list.map((it) => pr_str(it, print_readably)).join(" ") + ")"
    );
  }

  if (ast.type === "vector") {
    return (
      "[" + ast.list.map((it) => pr_str(it, print_readably)).join(" ") + "]"
    );
  }

  if (ast.type === "hash-map") {
    return (
      "{" + ast.list.map((it) => pr_str(it, print_readably)).join(" ") + "}"
    );
  }

  throw assertNever(ast);
}
