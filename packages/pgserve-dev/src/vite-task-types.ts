export type GlobWithBase = {
  pattern: string;
  base: "package" | "workspace";
};

export type AutoInput = {
  auto: boolean;
};

export type Task = {
  command: string | string[];
  cwd?: string;
  dependsOn?: string[];
} & (
  | {
      cache?: true;
      env?: string[];
      untrackedEnv?: string[];
      input?: Array<string | GlobWithBase | AutoInput>;
      output?: Array<string | GlobWithBase>;
    }
  | {
      cache: false;
    }
);

export type TaskDefinition = Task | string | string[];

export type TaskPluginContext = {
  bin: (name: string) => string;
};
