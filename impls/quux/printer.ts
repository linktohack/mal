import { assertNever } from "./utils";
import { MalType } from "./types";

export function pr_str(ast: MalType, print_readably = true): string {
  if (ast.type === "atom") {
    const atom = ast.atom;
    if (atom.type === "true" || atom.type === "false" || atom.type === "nil") {
      return atom.type;
    }
    if (atom.type === "number") {
      return `${atom.number}`;
    }

    if (atom.type === "keyword") {
      return atom.keyword;
    }

    if (atom.type === "symbol") {
      return atom.symbol;
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
        return atom.string;
      }
    }

    if (atom.type === "function") {
      return "#<function>";
    }

    if (atom.type === "tco_function") {
      return "#<function>";
    }

    if (atom.type === "clojure-atom") {
      return "(atom " + pr_str(atom.atom, print_readably) + ")";
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
