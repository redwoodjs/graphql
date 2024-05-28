import { rscBuildAnalyze } from './rsc/rscBuildAnalyze.js'
import { rscBuildClient } from './rsc/rscBuildClient.js'
import { rscBuildCopyCssAssets } from './rsc/rscBuildCopyCssAssets.js'
import { rscBuildEntriesMappings } from './rsc/rscBuildEntriesFile.js'
import { rscBuildForServer } from './rsc/rscBuildForServer.js'
import { rscBuildForSsr } from './rsc/rscBuildForSsr.js'
import { rscBuildRwEnvVars } from './rsc/rscBuildRwEnvVars.js'

export const buildRscClientAndServer = async (verbose = false) => {
  // Analyze all files and generate a list of RSCs and RSFs
  const { clientEntryFiles, serverEntryFiles } = await rscBuildAnalyze()

  // Generate the client bundle
  const clientBuildOutput = await rscBuildClient(clientEntryFiles)

  // Generate the server output
  const serverBuildOutput = await rscBuildForServer(
    clientEntryFiles,
    serverEntryFiles,
    {},
  )

  // Copy CSS assets from server to client
  //
  // TODO (RSC): We need to better understand how this work and how it can be
  // improved.
  // Can we do this more similar to how it's done for streaming?
  await rscBuildCopyCssAssets(serverBuildOutput)

  // Mappings from standard names to full asset names
  // Used by the RSC worker
  await rscBuildEntriesMappings(
    clientBuildOutput,
    serverBuildOutput,
    clientEntryFiles,
  )

  await rscBuildForSsr({ clientEntryFiles, verbose })

  // Make RW specific env vars, like RWJS_ENV, available to server components
  await rscBuildRwEnvVars()
}
