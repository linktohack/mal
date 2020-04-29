import { createInterface } from "readline";
import { flowRight } from "lodash/fp";

function READ(args: string) {
  return args;
}

function EVAL(args: string) {
  return args;
}

function PRINT(args: string) {
  console.log(args);
}

function rep(args: string) {
  flowRight(PRINT, EVAL, READ)(args);
}

function mainLoop() {
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

mainLoop();
