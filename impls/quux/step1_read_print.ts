import { createInterface } from "readline";
import { flowRight } from "lodash/fp";
import { read_str, MalType } from "./reader";
import { pr_str } from "./printer";

type Result<T, E> = { type: "ok"; ok: MalType } | { type: "err"; err: Error };

function READ(str: string): Result<MalType, Error> {
  try {
    const ok = read_str(str);
    return { type: "ok", ok };
  } catch (err) {
    return { type: "err", err };
  }
}

function EVAL(form: Result<MalType, Error>): Result<MalType, Error> {
  return form;
}

function PRINT(form: Result<MalType, Error>) {
  if (form.type === "ok") {
    console.log(pr_str(form.ok));
  } else {
    console.log(form.err.message);
  }
}

function rep(args: string) {
  flowRight(PRINT, EVAL, READ)(args);
}

function main_loop() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt("user> ");
  rl.on("line", (answer) => {
    if (!answer) {
      rl.close();
    } else {
      rep(answer);
      rl.prompt();
    }
  });
  rl.prompt();
}

main_loop();
