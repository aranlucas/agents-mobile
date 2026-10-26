import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

const hook = resolve(".husky/pre-push");

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function fixture(mode = "aligned") {
  const directory = mkdtempSync(join(tmpdir(), "expo-hook-"));
  directories.push(directory);

  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: directory, encoding: "utf8" });

  git("init", "--quiet");
  git("config", "core.hooksPath", "/dev/null");
  git("config", "user.name", "Hook test");
  git("config", "user.email", "hook@example.invalid");
  writeFileSync(join(directory, "package.json"), "original manifest\n");
  writeFileSync(join(directory, "pnpm-lock.yaml"), "original lockfile\n");
  writeFileSync(join(directory, "notes.txt"), "original notes\n");
  git("add", ".");
  git("commit", "--quiet", "-m", "fixture");
  mkdirSync(join(directory, "bin"));
  writeFileSync(
    join(directory, "bin/pnpm"),
    `#!/bin/sh
echo "$*" >> calls.log
case "$*" in
  *"install --fix")
    case "$EXPO_HOOK_TEST_MODE" in
      drift)
        echo "aligned manifest" > package.json
        echo "aligned lockfile" > pnpm-lock.yaml
        ;;
      failure) exit 7 ;;
    esac
    ;;
esac
`,
    { mode: 0o755 },
  );

  return {
    git,
    read: (file: string) => readFileSync(join(directory, file), "utf8"),
    write: (file: string, content: string) => writeFileSync(join(directory, file), content),
    run: () =>
      spawnSync("sh", [hook], {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${join(directory, "bin")}:${process.env.PATH}`,
          EXPO_HOOK_TEST_MODE: mode,
        },
      }),
  };
}

test("aligned dependencies allow a push without changing unrelated staged or unstaged edits", () => {
  const repo = fixture();
  repo.write("notes.txt", "staged notes\n");
  repo.git("add", "notes.txt");
  repo.write("notes.txt", "unstaged notes\n");
  const index = repo.git("diff", "--cached");
  const worktree = repo.git("diff");
  expect(repo.run().status).toBe(0);
  expect(repo.read("calls.log")).toBe("exec expo install --fix\n");
  expect(repo.git("diff", "--cached")).toBe(index);
  expect(repo.git("diff")).toBe(worktree);
});

test("alignment updates manifest and lockfile but blocks pushing until they are committed", () => {
  const repo = fixture("drift");
  const result = repo.run();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Review and commit package.json and pnpm-lock.yaml");
  expect(repo.read("package.json")).toBe("aligned manifest\n");
  expect(repo.read("pnpm-lock.yaml")).toBe("aligned lockfile\n");
  expect(repo.git("diff", "--cached")).toBe("");
  repo.git("add", "package.json", "pnpm-lock.yaml");
  repo.git("commit", "--quiet", "-m", "align dependencies");
  expect(repo.run().status).toBe(0);
});

test.each(["staged", "unstaged", "partially staged"])(
  "preserves %s dependency edits without invoking Expo",
  (state) => {
    const repo = fixture("drift");
    repo.write("package.json", "user manifest\n");

    if (state !== "unstaged") repo.git("add", "package.json");

    if (state === "partially staged") repo.write("package.json", "unstaged user manifest\n");
    const index = repo.git("diff", "--cached");
    const worktree = repo.git("diff");
    const result = repo.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("left them untouched");
    expect(repo.git("diff", "--cached")).toBe(index);
    expect(repo.git("diff")).toBe(worktree);
  },
);

test("a resolver failure blocks the push", () => {
  const repo = fixture("failure");
  expect(repo.run().status).toBe(7);
  expect(repo.read("calls.log")).toBe("exec expo install --fix\n");
  expect(repo.git("diff")).toBe("");
});

test("lockfile-only edits also block alignment without changing the index", () => {
  const repo = fixture("drift");
  repo.write("pnpm-lock.yaml", "user lockfile\n");
  const result = repo.run();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("left them untouched");
  expect(repo.read("package.json")).toBe("original manifest\n");
  expect(repo.read("pnpm-lock.yaml")).toBe("user lockfile\n");
  expect(repo.git("diff", "--cached")).toBe("");
});
