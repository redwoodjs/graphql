export type GlobWithBase = {
  pattern: string;
  base: "package" | "workspace";
};

export type Task = {
  command: string | string[];
  cwd?: string;
  dependsOn?: string[];
} & (
  | {
      cache?: true;
      input?: Array<string | GlobWithBase>;
      output?: Array<string | GlobWithBase>;
    }
  | {
      cache: false;
    }
);

export type TaskDefinition = Task | string | string[];
