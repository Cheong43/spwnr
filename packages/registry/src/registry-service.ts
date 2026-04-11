import Database from 'better-sqlite3'
import { openDatabase } from './db.js'
import { PackageStore } from './package-store.js'
import { SignatureService } from './signature-service.js'
import { TarballService } from './tarball-service.js'
import { getTarballPath, getInstalledPackageDir } from './artifact-paths.js'
import { loadPackage } from '@spwnr/manifest-schema'
import { SpwnrError, ErrorCodes } from '@spwnr/core-types'
import type { HostType, SubagentManifest } from '@spwnr/core-types'

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
  query?: string
  host?: HostType
  domain?: string
  limit?: number
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
  preferredDomain?: string
  role: WorkerRole
  limit?: number
}

export interface WorkerShortlistResult {
  role: WorkerRole
  taskBrief: string
  preferredDomain: string | null
  candidates: SearchPackageResult[]
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

export class RegistryService {
  private readonly db: Database.Database
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

    const manifest = JSON.parse(versionRow.manifest_json) as SubagentManifest
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
      manifest: JSON.parse(versionRow.manifest_json) as SubagentManifest,
      signature: versionRow.signature,
      tarballPath: versionRow.tarball_path,
      publishedAt: versionRow.published_at,
    }
  }

  searchPackages(options: SearchPackagesOptions = {}): SearchPackageResult[] {
    const limit = options.limit ?? 8
    const normalizedDomain = options.domain ? normalizeText(options.domain) : null
    const ftsQuery = options.query ? buildFtsQuery(options.query) : ''

    const ranked = this.store.listSearchRows({
      query: ftsQuery || undefined,
      host: options.host,
      limit,
    })
      .map((row) => {
        const domains = row.domains ? row.domains.split(/\s+/u).filter(Boolean) : []
        const hosts = row.compatibility_hosts
          ? row.compatibility_hosts.split(/\s+/u).filter(Boolean) as HostType[]
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

  close(): void {
    this.db.close()
  }

}
