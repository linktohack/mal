import { createInterface } from "readline";
import { read_str } from "./reader";
import { pr_str } from "./printer";
import { inspect } from "util";
import { Env } from "./env";
import { assertNever, LOG } from "./utils";
import {
  makeFunction,
  makeHashMap,
  makeList,
  makeNil,
  makeTcoFunction,
  makeVector,
  MalType,
} from "./types";
import { core } from "./core";

function READ(str: string): MalType {
  return read_str(str);
}

export function EVAL(ast: MalType, env: Env): MalType {
  // LOG("EVAL", inspect(ast, false, 10), inspect(env, false, 10));
  while (true) {
    if (ast.type !== "list") {
      return eval_ast(ast, env);
    } else {
      if (ast.list.length === 0) {
        return ast;
      } else {
        const [f0, f1, f2, f3] = ast.list;
        if (f0.type === "atom" && f0.atom.type === "symbol") {
          if (f0.atom.symbol === "def!") {
            if (!f1 || f1.type !== "atom" || f1.atom.type !== "symbol") {
              throw new Error("second element of def! must be a symbol");
            }
            return env.set(f1.atom.symbol, EVAL(f2, env));
          }

          if (f0.atom.symbol === "let*") {
            if (!f1 || (f1.type !== "list" && f1.type !== "vector")) {
              throw new Error(
                "second element of let* must be a list or a vector"
              );
            }
            const newEnv = new Env(env);
            for (let index = 0; index < f1.list.length / 2; index++) {
              LOG("index", index);
              const f12 = f1.list[2 * index];
              const f13 = f1.list[2 * index + 1];
              LOG("let*", inspect(f12, false, 10), inspect(f13, false, 10));
              if (f12.type !== "atom" || f12.atom.type !== "symbol") {
                throw new Error("must be a symbol");
              }
              newEnv.set(f12.atom.symbol, EVAL(f13, newEnv));
            }
            // return EVAL(f2, newEnv);
            ast = f2;
            env = newEnv;
            continue;
          }

          if (f0.atom.symbol === "do") {
            const [_, ...rest] = ast.list;
            const evaled = rest.map((e) => {
              return EVAL(e, env); // FIXME(QL): How come it's possible to use only eval_ast here?
            });
            // return evaled[evaled.length - 1];
            ast = evaled[evaled.length - 1];
            continue;
          }

          if (f0.atom.symbol === "if") {
            const cond = EVAL(f1, env);
            if (
              cond.type === "atom" &&
              (cond.atom.type === "false" || cond.atom.type === "nil")
            ) {
              // return (f3 && EVAL(f3, env)) || makeNil();
              ast = f3 || makeNil();
              continue;
            } else {
              // return (f2 && EVAL(f2, env)) || makeNil();
              ast = f2 || makeNil();
              continue;
            }
          }

          if (f0.atom.symbol === "fn*") {
            if (!f1 || (f1.type !== "list" && f1.type !== "vector")) {
              throw new Error(
                "second element of let* must be a list or a vector"
              );
            }
            // return makeFunction((...args) => {
            //   const newEnv = new Env(env, f1.list, args);
            //   return EVAL(f2, newEnv);
            // });

            return makeTcoFunction(
              f2,
              f1.list,
              env,
              makeFunction((...args) => {
                const newEnv = new Env(env, f1.list, args);
                return EVAL(f2, newEnv);
              })
            );
          }
        }
        const all = eval_ast(ast, env) as { type: "list"; list: MalType[] }; // FIXME(QL) proper typing for union
        const [f, ...args] = all.list;
        LOG("call", f, args);
        if (f.type === "atom" && f.atom.type === "tco_function") {
          ast = f.atom.ast;
          env = new Env(f.atom.env, f.atom.params, args);
          continue;
        }

        if (f.type === "atom" && f.atom.type === "function") {
          return f.atom.function(...args);
        }

        throw new Error("f must be a function");
      }
    }
  }
}

function eval_ast(ast: MalType, env: Env): MalType {
  // LOG("eval_ast", inspect(ast, false, 10));
  switch (ast.type) {
    case "atom":
      switch (ast.atom.type) {
        case "symbol":
          return env.get(ast.atom.symbol);
        default:
          return ast;
      }
    // return ast;
    case "list":
      return makeList(...ast.list.map((it) => EVAL(it, env)));
    case "vector":
      return makeVector(...ast.list.map((it) => EVAL(it, env)));
    case "hash-map":
      return makeHashMap(...ast.list.map((it) => EVAL(it, env)));
    default:
      throw assertNever(ast);
  }
}

function PRINT(ast: MalType) {
  if (interactive) {
    console.log(pr_str(ast));
  }
}

function rep(args: string, env: Env) {
  PRINT(EVAL(READ(args), env));
}

function main_loop() {
  const [node, base, argv0, ...argv] = process.argv;

  if (argv0) {
    interactive = false;
  }

  rep(
    `(def! *ARGV* (list ${argv.map((it) => JSON.stringify(it)).join(" ")}))`,
    env
  );
  rep("(def! not (fn* (a) (if a false true)))", env);
  rep("(def! sumdown (fn* (a) (if (= 0 a) 0 (+ a (sumdown (- a 1))))))", env);
  rep(
    '(def! load-file (fn* (file-name) (eval (read-string (str "(do\n" (slurp file-name) "\nnil)")) )))',
    env
  );

  if (argv0) {
    rep(`(load-file "${argv0}")`, env);
    process.exit(0);
  }

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

export const env = new Env();

Object.keys(core).forEach((k) => {
  env.set(k, makeFunction(core[k]));
});

let interactive = true;

main_loop();
