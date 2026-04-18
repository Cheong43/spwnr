import { openDatabase } from './db.js'
import { PackageStore } from './package-store.js'
import { SignatureService } from './signature-service.js'
import { TarballService } from './tarball-service.js'
import { getTarballPath, getInstalledPackageDir } from './artifact-paths.js'
import { loadPackage, parseManifest } from '@spwnr/manifest-schema'
import { SpwnrError, ErrorCodes, HostType } from '@spwnr/core-types'
import type { SubagentManifest } from '@spwnr/core-types'
import type { SqliteDatabase } from './sqlite.js'

export interface PublishResult {
  name: string
  version: string
  signature: string
  tarballPath: string
}

export interface InstallResult {
  name: string
  version: string
  installedDir: string
}

export interface ListEntry {
  name: string
  versions: string[]
  latestVersion: string | null
}

export interface InfoResult {
  name: string
  version: string
  manifest: SubagentManifest
  signature: string
  tarballPath: string
  publishedAt: string
}

export interface SearchPackagesOptions {
  query?: string | undefined
  host?: HostType | undefined
  domain?: string | undefined
  limit?: number | undefined
}

export interface SearchPackageResult {
  agentName: string
  version: string
  summary: string
  domains: string[]
  hosts: HostType[]
  score: number
}

export type WorkerRole = 'research' | 'execute' | 'review'

export interface ShortlistWorkersOptions {
  taskBrief: string
  host: HostType
  preferredDomain?: string | undefined
  role: WorkerRole
  limit?: number | undefined
}

export interface WorkerShortlistResult {
  role: WorkerRole
  taskBrief: string
  preferredDomain: string | null
  candidates: SearchPackageResult[]
}

export interface WorkerCoverageUnitOptions {
  unitId: string
  taskBrief: string
  preferredDomain?: string | undefined
  limit?: number | undefined
}

export interface WorkerCoverageUnitResult {
  unitId: string
  taskBrief: string
  preferredDomain: string | null
  candidates: SearchPackageResult[]
}

export interface WorkerCoverageSelectionEntry {
  agentName: string
  coversUnitIds: string[]
}

export interface WorkerCoveragePlanOptions {
  host: HostType
  preferredDomain?: string | undefined
  units: WorkerCoverageUnitOptions[]
  limit?: number | undefined
}

export interface WorkerCoveragePlanResult {
  preferredDomain: string | null
  units: WorkerCoverageUnitResult[]
  recommendedSelection: WorkerCoverageSelectionEntry[]
  uncoveredUnitIds: string[]
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2)
}

function buildFtsQuery(query: string): string {
  const tokens = tokenize(query)
  if (tokens.length === 0) {
    return ''
  }

  return tokens
    .map((token) => `"${token.replaceAll('"', '""')}"`)
    .join(' OR ')
}

function byName(left: SearchPackageResult, right: SearchPackageResult): number {
  return left.agentName.localeCompare(right.agentName)
}

function toDisplayScore(rawScore: number): number {
  if (rawScore === 0) {
    return 0
  }

  return Number((-rawScore).toFixed(6))
}

function isHostType(value: string): value is HostType {
  return Object.values(HostType).some((hostType) => hostType === value)
}

function parseHostTypes(value: string): HostType[] {
  return value
    .split(/\s+/u)
    .filter(isHostType)
}

function buildCoverageSelection(
  units: WorkerCoverageUnitResult[],
): Pick<WorkerCoveragePlanResult, 'recommendedSelection' | 'uncoveredUnitIds'> {
  const remainingUnitIds = new Set(
    units
      .filter((unit) => unit.candidates.length > 0)
      .map((unit) => unit.unitId),
  )
  const recommendedSelection: WorkerCoverageSelectionEntry[] = []

  while (remainingUnitIds.size > 0) {
    const packageCoverage = new Map<string, { coversUnitIds: string[]; aggregateScore: number }>()

    for (const unit of units) {
      if (!remainingUnitIds.has(unit.unitId)) {
        continue
      }

      for (const candidate of unit.candidates) {
        const entry = packageCoverage.get(candidate.agentName) ?? {
          coversUnitIds: [],
          aggregateScore: 0,
        }
        entry.coversUnitIds.push(unit.unitId)
        entry.aggregateScore += candidate.score
        packageCoverage.set(candidate.agentName, entry)
      }
    }

    const rankedPackages = [...packageCoverage.entries()].sort((left, right) => {
      const leftCoverage = left[1].coversUnitIds.length
      const rightCoverage = right[1].coversUnitIds.length
      if (leftCoverage !== rightCoverage) {
        return rightCoverage - leftCoverage
      }

      if (left[1].aggregateScore !== right[1].aggregateScore) {
        return right[1].aggregateScore - left[1].aggregateScore
      }

      return left[0].localeCompare(right[0])
    })

    const nextSelection = rankedPackages[0]
    if (!nextSelection) {
      break
    }

    const coversUnitIds = [...new Set(nextSelection[1].coversUnitIds)].sort()
    recommendedSelection.push({
      agentName: nextSelection[0],
      coversUnitIds,
    })

    for (const unitId of coversUnitIds) {
      remainingUnitIds.delete(unitId)
    }
  }

  const uncoveredUnitIds = units
    .filter((unit) =>
      unit.candidates.length === 0
        || !recommendedSelection.some((selection) => selection.coversUnitIds.includes(unit.unitId)),
    )
    .map((unit) => unit.unitId)
    .sort()

  return {
    recommendedSelection,
    uncoveredUnitIds,
  }
}

function parseStoredManifest(manifestJson: string): SubagentManifest {
  return parseManifest(JSON.parse(manifestJson))
}

export class RegistryService {
  private readonly db: SqliteDatabase
  private readonly store: PackageStore
  private readonly signer: SignatureService
  private readonly tarball: TarballService

  constructor(dbPath?: string) {
    this.db = openDatabase(dbPath)
    this.store = new PackageStore(this.db)
    this.store.syncSearchIndex()
    this.signer = new SignatureService()
    this.tarball = new TarballService()
  }

  async publish(packageDir: string): Promise<PublishResult> {
    const result = loadPackage(packageDir)
    if (!result.success) {
      throw new SpwnrError(ErrorCodes.MANIFEST_INVALID, result.error.message, result.error)
    }

    const manifest = result.result.manifest
    const name = manifest.metadata.name
    const version = manifest.metadata.version

    const signature = this.signer.sign(manifest)
    const tarballPath = getTarballPath(name, version)

    await this.tarball.pack(packageDir, tarballPath)

    this.store.publishVersion({
      packageName: name,
      version,
      manifest,
      signature,
      tarballPath,
    })

    return { name, version, signature, tarballPath }
  }

  async install(packageName: string, version: string = 'latest'): Promise<InstallResult> {
    let versionRow
    if (version === 'latest') {
      versionRow = this.store.getLatestVersion(packageName)
    } else {
      versionRow = this.store.getVersion(packageName, version)
    }

    if (!versionRow) {
      throw new SpwnrError(
        ErrorCodes.PACKAGE_NOT_FOUND,
        `Package ${packageName}@${version === 'latest' ? 'latest' : version} not found`,
      )
    }

    const installedDir = getInstalledPackageDir(packageName, versionRow.version)
    await this.tarball.extract(versionRow.tarball_path, installedDir)

    const manifest = parseStoredManifest(versionRow.manifest_json)
    const isValid = this.signer.verify(manifest, versionRow.signature)
    if (!isValid) {
      throw new SpwnrError(
        ErrorCodes.SIGNATURE_INVALID,
        `Signature verification failed for ${packageName}@${versionRow.version}`,
      )
    }

    return { name: packageName, version: versionRow.version, installedDir }
  }

  list(): ListEntry[] {
    return this.store.listPackages().map((pkg) => ({
      name: pkg.name,
      versions: pkg.versions.map((v) => v.version),
      latestVersion: pkg.versions[0]?.version ?? null,
    }))
  }

  info(packageName: string, version: string = 'latest'): InfoResult {
    let versionRow
    if (version === 'latest') {
      versionRow = this.store.getLatestVersion(packageName)
    } else {
      versionRow = this.store.getVersion(packageName, version)
    }

    if (!versionRow) {
      throw new SpwnrError(
        ErrorCodes.PACKAGE_NOT_FOUND,
        `Package ${packageName}@${version === 'latest' ? 'latest' : version} not found`,
      )
    }

    return {
      name: packageName,
      version: versionRow.version,
      manifest: parseStoredManifest(versionRow.manifest_json),
      signature: versionRow.signature,
      tarballPath: versionRow.tarball_path,
      publishedAt: versionRow.published_at,
    }
  }

  searchPackages(options: SearchPackagesOptions = {}): SearchPackageResult[] {
    const limit = options.limit ?? 8
    const normalizedDomain = options.domain ? normalizeText(options.domain) : null
    const ftsQuery = options.query ? buildFtsQuery(options.query) : ''
    const searchRowOptions = {
      ...(ftsQuery ? { query: ftsQuery } : {}),
      ...(options.host ? { host: options.host } : {}),
      limit,
    }

    const ranked = this.store.listSearchRows(searchRowOptions)
      .map((row) => {
        const domains = row.domains ? row.domains.split(/\s+/u).filter(Boolean) : []
        const hosts = row.compatibility_hosts
          ? parseHostTypes(row.compatibility_hosts)
          : []
        const domainMatch = normalizedDomain
          ? domains.some((domain) => normalizeText(domain) === normalizedDomain)
          : false

        return {
          entry: {
            agentName: row.agent_name,
            version: row.version,
            summary: row.summary,
            domains,
            hosts,
            score: toDisplayScore(row.raw_score),
          },
          domainMatch,
          rawScore: row.raw_score,
        }
      })
      .sort((left, right) => {
        if (left.domainMatch !== right.domainMatch) {
          return left.domainMatch ? -1 : 1
        }

        if (left.rawScore !== right.rawScore) {
          return left.rawScore - right.rawScore
        }

        return byName(left.entry, right.entry)
      })

    return ranked.slice(0, limit).map((result) => result.entry)
  }

  shortlistWorkers(options: ShortlistWorkersOptions): WorkerShortlistResult {
    return {
      role: options.role,
      taskBrief: options.taskBrief,
      preferredDomain: options.preferredDomain ?? null,
      candidates: this.searchPackages({
        query: options.taskBrief,
        host: options.host,
        domain: options.preferredDomain,
        limit: options.limit ?? 8,
      }),
    }
  }

  buildCoveragePlan(options: WorkerCoveragePlanOptions): WorkerCoveragePlanResult {
    const units = options.units.map((unit) => ({
      unitId: unit.unitId,
      taskBrief: unit.taskBrief,
      preferredDomain: unit.preferredDomain ?? options.preferredDomain ?? null,
      candidates: this.searchPackages({
        query: unit.taskBrief,
        host: options.host,
        domain: unit.preferredDomain ?? options.preferredDomain,
        limit: unit.limit ?? options.limit ?? 8,
      }),
    }))

    return {
      preferredDomain: options.preferredDomain ?? null,
      units,
      ...buildCoverageSelection(units),
    }
  }

  close(): void {
    this.db.close()
  }

}
