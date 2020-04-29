import { createInterface } from "readline";
import { read_str } from "./reader";
import { pr_str } from "./printer";
import { inspect } from "util";
import { Env } from "./env";
import { assertNever, LOG } from "./utils";
import { MalType } from "./types";

function READ(str: string): MalType {
  return read_str(str);
}

function EVAL(ast: MalType, env: Env): MalType {
  LOG("EVAL", inspect(ast, false, 10), inspect(env, false, 10));
  if (ast.type !== "list") {
    return eval_ast(ast, env);
  } else {
    if (ast.list.length === 0) {
      return ast;
    } else {
      const f1 = ast.list[0];
      const f2 = ast.list[1] as any;
      const f3 = ast.list[2];

      if (f1.type === "atom" && f1.atom.type === "symbol") {
        if (f1.atom.symbol === "def!") {
          return env.set(f2.atom.symbol, EVAL(f3, env)) as any;
        }

        if (f1.atom.symbol === "let*") {
          const newEnv = new Env(env);
          for (let index = 0; index < f2.list.length / 2; index++) {
            LOG("index", index);
            const f22 = f2.list[2 * index];
            const f23 = f2.list[2 * index + 1];
            LOG("let*", inspect(f22, false, 10), inspect(f23, false, 10));
            newEnv.set(f22.atom.symbol, EVAL(f23, newEnv));
          }
          return EVAL(f3, newEnv);
        }
      }
      const all = eval_ast(ast, env) as any;
      const [f, ...args] = all.list;
      LOG("call", f, args);
      return f(...args);
    }
  }
}

function eval_ast(ast: MalType, env: Env): MalType {
  LOG("eval_ast", inspect(ast, false, 10));
  switch (ast.type) {
    case "atom":
      switch (ast.atom.type) {
        case "symbol":
          return env.get(ast.atom.symbol) as any;
        default:
          return ast;
      }
    // return ast;
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

function PRINT(ast: MalType) {
  console.log(pr_str(ast));
}

function rep(args: string, env: Env) {
  PRINT(EVAL(READ(args), env));
}

function main_loop() {
  const env = new Env();

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
      rep(answer, env);
    } catch (err) {
      console.log(err.message);
    }
    rl.prompt();
    // }
  });
  rl.prompt();
}

main_loop();
