import semver from 'semver'
import Debug from 'debug'
import fs from 'fs'
import * as path from 'path'

const debug = Debug('hydra-processor:util')

export function validateHydraVersion(hydraVersion: string): void {
  const oursHydraVersion = getHydraVersion()
  if (
    !semver.satisfies(oursHydraVersion, hydraVersion, {
      loose: true,
      includePrerelease: true,
    })
  ) {
    throw new Error(`The processor version ${oursHydraVersion} does \\
not satisfy the required manifest version ${hydraVersion}`)
  }
}

export function validateIndexerVersion(
  indexerVersion: string,
  indexerVersionRange: string
): void {
  if (
    !semver.satisfies(indexerVersion, indexerVersionRange, {
      loose: true,
      includePrerelease: true,
    })
  ) {
    throw new Error(`The indexer version range ${indexerVersionRange} does \\
not satisfy the manifest version ${indexerVersion}`)
  }
}

export function getHydraVersion(): string {
  const packageJsonFile = path.resolve(__dirname, '../../../package.json')
  const pkg = JSON.parse(fs.readFileSync(packageJsonFile, 'utf-8'))
  debug(`Resolved package.json: ${JSON.stringify(pkg, null, 2)}`)
  if (pkg.version) return pkg.version
  throw new Error(`Can't resolve hydra-processor version`)
}
