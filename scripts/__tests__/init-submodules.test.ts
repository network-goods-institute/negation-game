import fs from "fs";
import os from "os";
import path from "path";

import {
  carrollStubs,
  initSubmodules,
  removeCarrollStubsIfPresent,
  writeCarrollStubs,
} from "../init-submodules.js";

const criticalSubmodules = ["discourse", "yjs-ws"];

const createTempRepo = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "init-submodules-"));
  return { root, carrollDir: path.join(root, "src", "lib", "carroll") };
};

const stubCriticalSubmodules = (root: string) => {
  for (const name of criticalSubmodules) {
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ".git"), "stub");
  }
};

describe("init-submodules", () => {
  let tempRoot: string;
  let carrollDir: string;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    ({ root: tempRoot, carrollDir } = createTempRepo());
    exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null | undefined) => {
        throw new Error(`process.exit: ${code ?? ""}`);
      });
  });

  afterEach(() => {
    exitSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("removes generated carroll stubs before attempting to init submodule", () => {
    stubCriticalSubmodules(tempRoot);
    writeCarrollStubs(carrollDir);
    const runCommand = jest.fn((cmd, args) => {
      if (cmd === "git" && args[1] === "update") {
        if (fs.existsSync(carrollDir)) {
          throw new Error("stubs still present");
        }
      }
      return true;
    });

    initSubmodules({
      runCommand,
      repoRootPath: tempRoot,
      env: { ...process.env, NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED: "false" },
    });

    expect(runCommand).toHaveBeenCalledWith(
      "git",
      ["submodule", "update", "--init", "--recursive", "--depth", "1"],
      { allowFailure: true }
    );
    expect(fs.existsSync(carrollDir)).toBe(false);
  });

  it("does not remove non-stub carroll contents", () => {
    writeCarrollStubs(carrollDir);
    const alteredPath = path.join(carrollDir, "market.ts");
    fs.writeFileSync(alteredPath, "not a stub");

    const removed = removeCarrollStubsIfPresent(carrollDir);

    expect(removed).toBe(false);
    expect(fs.existsSync(carrollDir)).toBe(true);
    expect(fs.readFileSync(alteredPath, "utf8")).toBe("not a stub");
  });

  it("removes stub files when present", () => {
    writeCarrollStubs(carrollDir);

    const removed = removeCarrollStubsIfPresent(carrollDir);

    expect(removed).toBe(true);
    expect(fs.existsSync(carrollDir)).toBe(false);
  });

  it("recreates stubs when market features are disabled and update fails", () => {
    stubCriticalSubmodules(tempRoot);
    const runCommand = jest.fn((cmd, args) => {
      if (cmd === "git" && args[1] === "update") {
        return false;
      }
      return true;
    });

    initSubmodules({
      runCommand,
      repoRootPath: tempRoot,
      env: { ...process.env, NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED: "false" },
    });

    for (const [fileName, content] of Object.entries(carrollStubs)) {
      const filePath = path.join(carrollDir, fileName);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, "utf8")).toBe(content);
    }
  });

  it("succeeds when update passes and required submodules are initialized", () => {
    stubCriticalSubmodules(tempRoot);
    fs.mkdirSync(carrollDir, { recursive: true });
    fs.writeFileSync(path.join(carrollDir, ".git"), "stub");

    const runCommand = jest.fn(() => true);

    initSubmodules({
      runCommand,
      repoRootPath: tempRoot,
      env: { ...process.env, NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED: "false" },
    });

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits when update succeeds but a critical submodule is missing", () => {
    const runCommand = jest.fn(() => true);

    expect(() =>
      initSubmodules({
        runCommand,
        repoRootPath: tempRoot,
        env: { ...process.env },
      })
    ).toThrow("process.exit: 1");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when market features are enabled but carroll is absent after update", () => {
    stubCriticalSubmodules(tempRoot);
    const runCommand = jest.fn(() => true);

    expect(() =>
      initSubmodules({
        runCommand,
        repoRootPath: tempRoot,
        env: { ...process.env, NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED: "true" },
      })
    ).toThrow("process.exit: 1");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when submodule update fails outside the carroll-optional path", () => {
    fs.mkdirSync(carrollDir, { recursive: true });
    fs.writeFileSync(path.join(carrollDir, ".git"), "stub");

    const runCommand = jest.fn((cmd, args) => {
      if (cmd === "git" && args[1] === "update") {
        return false;
      }
      return true;
    });

    expect(() =>
      initSubmodules({
        runCommand,
        repoRootPath: tempRoot,
        env: { ...process.env },
      })
    ).toThrow("process.exit: 1");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("succeeds when market enabled and all submodules including carroll initialize", () => {
    stubCriticalSubmodules(tempRoot);
    fs.mkdirSync(carrollDir, { recursive: true });
    fs.writeFileSync(path.join(carrollDir, ".git"), "stub");

    const runCommand = jest.fn(() => true);

    initSubmodules({
      runCommand,
      repoRootPath: tempRoot,
      env: { ...process.env, NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED: "true" },
    });

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("uses --local git config instead of --global when token is provided", () => {
    stubCriticalSubmodules(tempRoot);
    fs.mkdirSync(carrollDir, { recursive: true });
    fs.writeFileSync(path.join(carrollDir, ".git"), "stub");

    const runCommand = jest.fn(() => true);

    initSubmodules({
      runCommand,
      repoRootPath: tempRoot,
      env: { ...process.env, GITHUB_TOKEN: "test-token" },
    });

    expect(runCommand).toHaveBeenCalledWith("git", [
      "config",
      "submodule.src/lib/carroll.url",
      "https://x-access-token:test-token@github.com/network-goods-institute/carroll-lmsr-ts.git",
    ]);
  });

  it("does not configure git when no token is provided", () => {
    stubCriticalSubmodules(tempRoot);
    fs.mkdirSync(carrollDir, { recursive: true });
    fs.writeFileSync(path.join(carrollDir, ".git"), "stub");

    const runCommand = jest.fn(() => true);

    // Pass clean env without any token variables
    const cleanEnv = Object.keys(process.env).reduce((acc, key) => {
      if (!key.includes('TOKEN') && !key.includes('token')) {
        acc[key] = process.env[key];
      }
      return acc;
    }, {} as NodeJS.ProcessEnv);

    initSubmodules({
      runCommand,
      repoRootPath: tempRoot,
      env: cleanEnv,
    });

    expect(runCommand).not.toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["config"])
    );
  });
});
