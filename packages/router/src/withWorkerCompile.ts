import type { RequestInfo } from "rwsdk/worker";

import { compileAppRoutes } from "./compileAppRoutes.js";
import type { CompileRoutesOptions } from "./compileFromDefinitions.js";
import type { DefinedRoutes } from "./defineRoutes.js";
import type { CompiledRoutes } from "./compileRoutes.js";

export type WorkerDefinedRoutes = DefinedRoutes & {
  compile: <T extends RequestInfo = RequestInfo>(
    options: CompileRoutesOptions<T>,
  ) => CompiledRoutes<T>;
};

export const withWorkerCompile = (defined: DefinedRoutes): WorkerDefinedRoutes => ({
  ...defined,
  compile: (options) => compileAppRoutes(defined, options),
});
