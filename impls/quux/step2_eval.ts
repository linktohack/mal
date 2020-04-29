import { createInterface } from "readline";
import { flowRight } from "lodash/fp";
import { read_str, MalType, Atom } from "./reader";
import { pr_str, assertNever } from "./printer";
import { inspect } from "util";

type Result<T, E> = { type: "ok"; ok: MalType } | { type: "err"; err: Error };

type Env = { [k: string]: (...args: any[]) => MalType };

function LOG(...args: any[]) {
  // console.log(...args);
}

const repl_env: Env = {
  quote: (...args: any) => ({
    type: "list",
    list: args,
  }),
  "+": (a: any, b: any) => {
    // LOG('+', {a, b});
    return {
      type: "atom",
      atom: { type: "number", number: a.atom.number + b.atom.number },
    };
  }, // FIXME(QL) Strong typing
  "-": (a: any, b: any) => ({
    type: "atom",
    atom: { type: "number", number: a.atom.number - b.atom.number },
  }),
  "*": (a: any, b: any) => {
    // LOG('+', {a, b});
    return {
      type: "atom",
      atom: { type: "number", number: a.atom.number * b.atom.number },
    };
  }, // FIXME(QL) Strong typing
  "/": (a: any, b: any) => ({
    type: "atom",
    atom: { type: "number", number: a.atom.number / b.atom.number },
  }),
};

function READ(str: string): MalType {
  return read_str(str);
}

function EVAL(ast: MalType, env: any): MalType {
  LOG("EVAL", inspect(ast, false, 10));
  if (ast.type !== "list") {
    return eval_ast(ast, env);
  } else {
    if (ast.list.length === 0) {
      return ast;
    } else {
      const all = eval_ast(ast, env) as any;
      const [f, ...args] = all.list;
      return lookup(f, env)(...args);
    }
  }
}

function eval_ast(ast: MalType, env: any): MalType {
  LOG("eval_ast", inspect(ast, false, 10));
  switch (ast.type) {
    case "atom":
      // switch (ast.atom.type) {
      //   case 'symbol':
      //     return lookup(ast.atom.symbol, env);
      //   default:
      //     return ast;
      // }
      return ast;
    case "list":
      return { type: "list", list: ast.list.map((it) => EVAL(it, env)) };
    case "vector":
      return { type: "vector", list: ast.list.map((it) => EVAL(it, env)) };
    case "hash-map":
      return { type: "hash-map", list: ast.list.map((it) => EVAL(it, env)) };
    default:
      throw assertNever(ast);
  }
}

function lookup(symbol: any, env: any): (...args: any[]) => MalType {
  // FIXME(QL) Strong type
  LOG("lookup", symbol);
  return repl_env[symbol.atom.symbol];
}

function PRINT(ast: MalType) {
  console.log(pr_str(ast));
}

function rep(args: string) {
  PRINT(EVAL(READ(args), repl_env));
}

function main_loop() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt("user> ");
  rl.on("line", (answer) => {
    // if (!answer) {
    //   rl.close();
    // }
    // else {
    try {
      rep(answer);
    } catch (err) {
      console.log(err.message);
    }
    rl.prompt();
    // }
  });
  rl.prompt();
}

main_loop();
