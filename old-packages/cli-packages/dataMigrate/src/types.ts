export type DataMigrateUpOptions = {
  importDbClientFromDist: boolean
  distPath: string
}

export type DataMigration = {
  version: string
  name: string
  startedAt: Date
  finishedAt: Date
}
