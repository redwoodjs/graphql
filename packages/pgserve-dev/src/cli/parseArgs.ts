export type CliArgs = Partial<Record<string, string | boolean | undefined>>;

export function parseCliArgs(argv = process.argv.slice(2)): CliArgs {
  return argv.reduce((acc, arg) => {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (match) {
      const [, key, value] = match;
      return { ...acc, [key!]: value === undefined ? true : value };
    }
    return acc;
  }, {} as CliArgs);
}

export function getStringArg(args: CliArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
