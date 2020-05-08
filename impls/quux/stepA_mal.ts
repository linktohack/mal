import { createInterface } from "readline";
import { read_str } from "./reader";
import { pr_str } from "./printer";
import { inspect } from "util";
import { Env } from "./env";
import { assertNever, LOG } from "./utils";
import {
  makeError,
  makeFunction,
  makeList,
  makeNil,
  makeString,
  makeSymbol,
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
    ast = macroexpand(ast, env);

    if (ast.type !== "list") {
      return eval_ast(ast, env);
    }

    if (ast.list.length === 0) {
      return ast;
    }

    const [f0, f1, f2, f3] = ast.list;
    if (f0.type === "atom" && f0.atom.type === "symbol") {
      if (f0.atom.symbol === "def!") {
        if (!f1 || f1.type !== "atom" || f1.atom.type !== "symbol") {
          throw new Error("second element of def! must be a symbol");
        }
        return env.set(f1.atom.symbol, EVAL(f2, env));
      }

      if (f0.atom.symbol === "defmacro!") {
        if (!f1 || f1.type !== "atom" || f1.atom.type !== "symbol") {
          throw new Error("second element of def! must be a symbol");
        }
        const macro = EVAL(f2, env);
        if (
          !macro ||
          macro.type !== "atom" ||
          macro.atom.type !== "tco_function"
        ) {
          throw new Error(
            "third element of defmacro! must be a (tco) function"
          );
        }
        macro.atom.is_macro = true;
        return env.set(f1.atom.symbol, macro);
      }

      if (f0.atom.symbol === "macroexpand") {
        ast = makeList(makeSymbol("quote"), macroexpand(f1, env));
        continue;
      }

      if (f0.atom.symbol === "try*") {
        // const formError = new Error("expect (catch* error form");
        // if (!f2 || f2.type !== "list") {
        //   throw formError;
        // }
        // const [maybeCatch, error, catchForm] = f2.list;
        // if (!maybeCatch || !error || !catchForm) {
        //   throw formError;
        // }
        // if (
        //   maybeCatch.type !== "atom" ||
        //   maybeCatch.atom.type !== "symbol" ||
        //   maybeCatch.atom.symbol !== "catch*"
        // ) {
        //   throw formError;
        // }
        // if (maybeCatch.type !== "atom" || maybeCatch.atom.type !== "symbol") {
        //   throw formError;
        // }
        const [maybeCatch, error, catchForm] =
          (f2 && (f2 as any).list) || ([] as MalType[]);
        try {
          ast = EVAL(f1, env);
          continue;
        } catch (err) {
          if (!maybeCatch || !error || !catchForm) {
            throw err;
          }
          let malError = err;
          if (err instanceof Error) {
            malError = makeError(makeString(err.message));
          }
          const newEnv = new Env(env, [error], [malError]); // FIXME(QL): Handle error here
          ast = catchForm;
          env = newEnv;
          continue;
        }
      }

      if (f0.atom.symbol === "let*") {
        if (!f1 || (f1.type !== "list" && f1.type !== "vector")) {
          throw new Error("second element of let* must be a list or a vector");
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
          throw new Error("second element of let* must be a list or a vector");
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

      if (f0.atom.symbol === "quote") {
        return f1;
      }

      if (f0.atom.symbol === "quasiquote") {
        ast = quasiquote(f1);
        continue;
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
      const newHashMap = {
        type: "hash-map" as const,
        list: new Map<MalType, MalType>(),
      }; // FIXME(QL): A lot of union...
      ast.list.forEach((v, k) => {
        newHashMap.list.set(EVAL(k, env), EVAL(v, env));
      });
      return newHashMap;
    default:
      throw assertNever(ast);
  }
}

function is_pair(
  ast: MalType
): ast is { type: "list" | "vector"; list: MalType[] } {
  return (ast.type === "list" || ast.type === "vector") && ast.list.length > 0;
}

function quasiquote(ast: MalType): MalType {
  if (!is_pair(ast)) {
    return makeList(makeSymbol("quote"), ast);
  }

  const [first, second, ...rest] = ast.list;
  if (
    first.type === "atom" &&
    first.atom.type === "symbol" &&
    first.atom.symbol === "unquote"
  ) {
    return second;
  }

  const [_, ...restWithSecond] = ast.list;

  if (is_pair(first)) {
    const [f0, f1] = first.list;
    if (
      f0.type === "atom" &&
      f0.atom.type === "symbol" &&
      f0.atom.symbol === "splice-unquote"
    ) {
      return makeList(
        makeSymbol("concat"),
        f1,
        quasiquote(makeList(...restWithSecond))
      );
    }
  }

  return makeList(
    makeSymbol("cons"),
    quasiquote(first),
    quasiquote(makeList(...restWithSecond))
  );
}

function is_macro(
  ast: MalType
): ast is {
  type: "atom";
  atom: {
    type: "tco_function";
    ast: MalType;
    params: MalType[];
    env: Env;
    fn: MalType;
    is_macro: true;
  };
} {
  return (
    ast &&
    ast.type === "atom" &&
    ast.atom.type === "tco_function" &&
    ast.atom.is_macro
  );
}

function is_macro_call(ast: MalType, env: Env) {
  return (
    ast.type === "list" &&
    ast.list[0] &&
    ast.list[0].type === "atom" &&
    ast.list[0].atom.type === "symbol" &&
    env.find(ast.list[0].atom.symbol) &&
    is_macro(env.find(ast.list[0].atom.symbol)!)
  );
}

export function macroexpand(ast: MalType, env: Env): MalType {
  while (is_macro_call(ast, env)) {
    const [first, ...rest] = (ast as any).list; // FIXME(QL): Strong typing
    const macro = env.get(first.atom.symbol) as any;
    ast = macroexpand(macro.atom.fn.atom.function(...rest), env);
  }
  return ast;
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

  rep(`(def! *host-language* "quux")`, env);
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
  rep(
    `(defmacro! cond (fn* (& xs) (if (> (count xs) 0) (list 'if (first xs) (if (> (count xs) 1) (nth xs 1) (throw \"odd number of forms to cond\")) (cons 'cond (rest (rest xs)))))))`,
    env
  );

  if (interactive) {
    rep(`(println (str "Mal [" *host-language* "]"))`, env);
  }

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
      if (err instanceof Error) {
        console.log("System Error: " + err.message);
      } else {
        console.log("Mal Error: " + pr_str(err, true));
      }
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
