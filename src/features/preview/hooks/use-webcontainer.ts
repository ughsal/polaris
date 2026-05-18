"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileSystemTree, WebContainer } from "@webcontainer/api";

import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { useFiles } from "../../projects/hooks/use-files";
import { buildFileTree, getFilePath } from "../utils/file-tree";

type PreviewSettings = {
  installCommand?: string;
  devCommand?: string;
};

type WebContainerStatus = "idle" | "booting" | "installing" | "running" | "error";

const DEFAULT_INSTALL_COMMAND = "npm install";
const DEFAULT_DEV_COMMAND = "npm run dev";

let containerPromise: Promise<WebContainer> | null = null;
let containerInstance: WebContainer | null = null;

type WebContainerEventTarget = WebContainer & {
  on?: (event: "server-ready", listener: (port: number, url: string) => void) => void;
  off?: (event: "server-ready", listener: (port: number, url: string) => void) => void;
};

function splitCommand(command: string) {
  const trimmed = command.trim();

  if (!trimmed) {
    return [];
  }

  return (
    trimmed.match(/"[^"]+"|'[^']+'|\S+/g)?.map(part =>
      part.replace(/^["']|["']$/g, ""),
    ) ?? []
  );
}

async function getContainer() {
  if (!containerPromise) {
    containerPromise = import("@webcontainer/api").then(async ({ WebContainer }) => {
      const instance = await WebContainer.boot({
        coep: "credentialless",
      });

      containerInstance = instance;
      return instance;
    });
  }

  return containerPromise;
}

async function teardownContainer() {
  const instance = containerInstance;
  containerInstance = null;
  containerPromise = null;

  if (instance) {
    try {
      await instance.teardown();
    } catch {
      // Ignore teardown errors during restart/unmount.
    }
  }
}

function buildFilesMap(files: Doc<"files">[]) {
  return new Map(files.map(file => [file._id, file] as const));
}

function findRootPackageJson(files: Doc<"files">[]) {
  const filesMap = buildFilesMap(files);

  return files.find(file => {
    if (file.type !== "file" || file.storageId) {
      return false;
    }

    return getFilePath(file, filesMap) === "package.json";
  });
}

function getCommandValue(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

async function ensureDirectory(path: string, container: WebContainer) {
  const parts = path.split("/").filter(Boolean);

  if (parts.length > 1) {
    await container.fs.mkdir(parts.slice(0, -1).join("/"), { recursive: true });
  }
}

async function writeTextFile(
  container: WebContainer,
  path: string,
  content: string,
) {
  await ensureDirectory(path, container);
  await container.fs.writeFile(path, content);
}

async function streamProcessOutput(
  process: Awaited<ReturnType<WebContainer["spawn"]>>,
  append: (chunk: string) => void,
) {
  const reader = process.output.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (typeof value === "string") {
        append(value);
      } else if (value && typeof value === "object" && "buffer" in value) {
        append(decoder.decode(value as Uint8Array, { stream: true }));
      } else if (value != null) {
        append(String(value));
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function runCommand(
  container: WebContainer,
  command: string,
  append: (chunk: string) => void,
) {
  const parts = splitCommand(command);

  if (!parts.length) {
    throw new Error("Command cannot be empty.");
  }

  const [executable, ...args] = parts;
  const process = await container.spawn(executable, args);
  void streamProcessOutput(process, append);

  const exitCode = await process.exit;

  if (exitCode !== 0) {
    throw new Error(`${command} exited with code ${exitCode}.`);
  }
}

async function mountTree(container: WebContainer, files: Doc<"files">[]) {
  const tree = buildFileTree(files);
  await container.mount(tree as FileSystemTree);
}

async function syncTextFiles(
  container: WebContainer,
  files: Doc<"files">[],
  previousSnapshot: Map<string, { path: string; content: string }>,
) {
  const filesMap = buildFilesMap(files);
  const nextSnapshot = new Map<string, { path: string; content: string }>();

  for (const file of files) {
    if (file.type !== "file" || file.storageId) {
      continue;
    }

    const path = getFilePath(file, filesMap);
    const content = file.content ?? "";
    const previous = previousSnapshot.get(file._id);

    nextSnapshot.set(file._id, { path, content });

    if (!previous || previous.path !== path || previous.content !== content) {
      await writeTextFile(container, path, content);
    }
  }

  return nextSnapshot;
}

export function useWebContainer({
  projectId,
  enabled,
  settings,
}: {
  projectId: Id<"projects">;
  enabled: boolean;
  settings?: PreviewSettings;
}) {
  const files = useFiles(enabled ? projectId : null);
  const [status, setStatus] = useState<WebContainerStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [restartToken, setRestartToken] = useState(0);
  const sessionRef = useRef(0);
  const containerRef = useRef<WebContainer | null>(null);
  const syncedFilesRef = useRef<Map<string, { path: string; content: string }>>(
    new Map(),
  );
  const terminalOutputRef = useRef("");

  const installCommand = useMemo(
    () => getCommandValue(settings?.installCommand, DEFAULT_INSTALL_COMMAND),
    [settings?.installCommand],
  );
  const devCommand = useMemo(
    () => getCommandValue(settings?.devCommand, DEFAULT_DEV_COMMAND),
    [settings?.devCommand],
  );

  const appendTerminalOutput = useCallback((chunk: string) => {
    if (!chunk) {
      return;
    }

    terminalOutputRef.current += chunk;
    setTerminalOutput(terminalOutputRef.current);
  }, []);

  const resetState = useCallback(() => {
    setStatus("idle");
    setPreviewUrl(null);
    setError(null);
    terminalOutputRef.current = "";
    setTerminalOutput("");
    syncedFilesRef.current = new Map();
  }, []);

  const restart = useCallback(async () => {
    sessionRef.current += 1;
    await teardownContainer();
    containerRef.current = null;
    resetState();
    setRestartToken(token => token + 1);
  }, [resetState]);

  useEffect(() => {
    if (!enabled) {
      sessionRef.current += 1;
      resetState();
      return;
    }

    if (files === undefined) {
      setStatus("booting");
      return;
    }

    if (!files.length) {
      setStatus("error");
      setError("This project has no files to preview yet.");
      setPreviewUrl(null);
      return;
    }

    if (!findRootPackageJson(files)) {
      setStatus("error");
      setError("No root package.json was found for this project.");
      setPreviewUrl(null);
      return;
    }

    const sessionId = ++sessionRef.current;
    let cancelled = false;
    let cleanupServerReady: (() => void) | null = null;

    const run = async () => {
      try {
        setError(null);
        setPreviewUrl(null);
        setStatus("booting");

        const container = await getContainer();
        if (cancelled || sessionRef.current !== sessionId) {
          return;
        }

        containerRef.current = container;
        await mountTree(container, files);
        const filesMap = buildFilesMap(files);
        syncedFilesRef.current = new Map(
          files
            .filter(file => file.type === "file" && !file.storageId)
            .map(file => [
              file._id,
              {
                path: getFilePath(file, filesMap),
                content: file.content ?? "",
              },
            ] as const),
        );

        setStatus("installing");
        appendTerminalOutput(`$ ${installCommand}\n`);
        await runCommand(container, installCommand, appendTerminalOutput);

        if (cancelled || sessionRef.current !== sessionId) {
          return;
        }

        const handleServerReady = (_port: number, url: string) => {
          if (cancelled || sessionRef.current !== sessionId) {
            return;
          }

          setPreviewUrl(url);
          setStatus("running");
        };

        const eventContainer = container as WebContainerEventTarget;
        eventContainer.on?.("server-ready", handleServerReady);
        cleanupServerReady = () => {
          eventContainer.off?.("server-ready", handleServerReady);
        };

        appendTerminalOutput(`$ ${devCommand}\n`);
        const devCommandParts = splitCommand(devCommand);
        const [executable, ...args] = devCommandParts;

        if (!executable) {
          throw new Error("Dev command cannot be empty.");
        }

        const devProcess = await container.spawn(executable, args);
        void streamProcessOutput(devProcess, appendTerminalOutput);

        void devProcess.exit
          .then(exitCode => {
            if (cancelled || sessionRef.current !== sessionId) {
              return;
            }

            if (exitCode !== 0) {
              setStatus("error");
              setError(`Dev server exited with code ${exitCode}.`);
              setPreviewUrl(null);
            }
          })
          .catch(err => {
            if (cancelled || sessionRef.current !== sessionId) {
              return;
            }

            setStatus("error");
            setError(err instanceof Error ? err.message : "Unable to start preview.");
            setPreviewUrl(null);
          });
      } catch (err) {
        if (cancelled || sessionRef.current !== sessionId) {
          return;
        }

        setStatus("error");
        setError(err instanceof Error ? err.message : "Unable to start preview.");
        setPreviewUrl(null);
      }
    };

    void run();

    return () => {
      cancelled = true;
      cleanupServerReady?.();
    };
  }, [appendTerminalOutput, devCommand, enabled, files, installCommand, resetState, restartToken]);

  useEffect(() => {
    if (!enabled || !containerRef.current || files === undefined || status === "booting") {
      return;
    }

    const container = containerRef.current;
    const previousSnapshot = syncedFilesRef.current;

    void syncTextFiles(container, files, previousSnapshot).then(nextSnapshot => {
      syncedFilesRef.current = nextSnapshot;
    });
  }, [enabled, files, status]);

  return {
    status,
    previewUrl,
    error,
    restart,
    terminalOutput,
  };
}
