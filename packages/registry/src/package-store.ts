import { randomUUID } from 'crypto'
import { SpwnrError, ErrorCodes } from '@spwnr/core-types'
import type { SubagentManifest } from '@spwnr/core-types'
import { parseManifest } from '@spwnr/manifest-schema'
import type { SqliteDatabase } from './sqlite.js'

export interface PackageRow {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface PackageVersionRow {
  id: string
  package_id: string
  version: string
  manifest_json: string
  signature: string
  tarball_path: string
  published_at: string
}

export interface PackageWithVersions extends PackageRow {
  versions: PackageVersionRow[]
}

export interface PackageSearchRow {
  package_id: string
  version_id: string
  agent_name: string
  version: string
  summary: string
  instruction: string
  description: string
  domains: string
  tags: string
  persona_role: string
  compatibility_hosts: string
}

interface LatestPackageVersionRecord {
  packageName: string
  versionRow: PackageVersionRow
}

function parseStoredManifest(manifestJson: string): SubagentManifest {
  return parseManifest(JSON.parse(manifestJson))
}

export class PackageStore {
  constructor(private readonly db: SqliteDatabase) {}

  /** Insert or get a package by name. Returns the package id. */
  upsertPackage(name: string, description?: string): string {
    const existing = this.db
      .prepare<[string], PackageRow>('SELECT * FROM packages WHERE name = ?')
      .get(name)
    if (existing) return existing.id

    const id = randomUUID()
    this.db
      .prepare('INSERT INTO packages (id, name, description) VALUES (?, ?, ?)')
      .run(id, name, description ?? null)
    return id
  }

  /** Publish a new version. Throws if version already exists. */
  publishVersion(opts: {
    packageName: string
    version: string
    manifest: SubagentManifest
    signature: string
    tarballPath: string
  }): PackageVersionRow {
    const packageId = this.upsertPackage(
      opts.packageName,
      opts.manifest.metadata?.description ?? opts.manifest.metadata.instruction,
    )

    const existing = this.db
      .prepare<[string, string], PackageVersionRow>(
        'SELECT * FROM package_versions WHERE package_id = ? AND version = ?',
      )
      .get(packageId, opts.version)

    if (existing) {
      throw new SpwnrError(
        ErrorCodes.VERSION_CONFLICT,
        `Version ${opts.version} already exists for ${opts.packageName}`,
      )
    }

    const id = randomUUID()
    const manifestJson = JSON.stringify(opts.manifest)
    this.db
      .prepare(
        `INSERT INTO package_versions (id, package_id, version, manifest_json, signature, tarball_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, packageId, opts.version, manifestJson, opts.signature, opts.tarballPath)

    this.replaceSearchDocument(packageId, {
      id,
      package_id: packageId,
      version: opts.version,
      manifest_json: manifestJson,
      signature: opts.signature,
      tarball_path: opts.tarballPath,
      published_at: new Date().toISOString(),
    })

    return this.db
      .prepare<[string], PackageVersionRow>('SELECT * FROM package_versions WHERE id = ?')
      .get(id)!
  }

  /** Get all packages with their versions. */
  listPackages(): PackageWithVersions[] {
    const packages = this.db
      .prepare<[], PackageRow>('SELECT * FROM packages ORDER BY name')
      .all()
    return packages.map((pkg) => ({
      ...pkg,
      versions: this.db
        .prepare<[string], PackageVersionRow>(
          'SELECT * FROM package_versions WHERE package_id = ? ORDER BY published_at DESC',
        )
        .all(pkg.id),
    }))
  }

  /** Get a specific package with all versions by name. */
  getPackage(name: string): PackageWithVersions | null {
    const pkg = this.db
      .prepare<[string], PackageRow>('SELECT * FROM packages WHERE name = ?')
      .get(name)
    if (!pkg) return null
    return {
      ...pkg,
      versions: this.db
        .prepare<[string], PackageVersionRow>(
          'SELECT * FROM package_versions WHERE package_id = ? ORDER BY published_at DESC',
        )
        .all(pkg.id),
    }
  }

  /** Get a specific version of a package. */
  getVersion(packageName: string, version: string): PackageVersionRow | null {
    const pkg = this.db
      .prepare<[string], PackageRow>('SELECT * FROM packages WHERE name = ?')
      .get(packageName)
    if (!pkg) return null
    return (
      this.db
        .prepare<[string, string], PackageVersionRow>(
          'SELECT * FROM package_versions WHERE package_id = ? AND version = ?',
        )
        .get(pkg.id, version) ?? null
    )
  }

  /** Get the latest version of a package (by published_at). */
  getLatestVersion(packageName: string): PackageVersionRow | null {
    const pkg = this.db
      .prepare<[string], PackageRow>('SELECT * FROM packages WHERE name = ?')
      .get(packageName)
    if (!pkg) return null
    return (
      this.db
        .prepare<[string], PackageVersionRow>(
          'SELECT * FROM package_versions WHERE package_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1',
        )
        .get(pkg.id) ?? null
    )
  }

  syncSearchIndex(): void {
    const latestRecords = this.listLatestPackageVersions()

    this.db.prepare('DELETE FROM package_search').run()
    for (const record of latestRecords) {
      this.replaceSearchDocument(record.versionRow.package_id, record.versionRow, record.packageName)
    }
  }

  listSearchRows(options: {
    query?: string
    limit: number
    host?: string
  }): Array<PackageSearchRow & { raw_score: number }> {
    const hostLike = options.host ? `%${options.host}%` : null
    const effectiveLimit = Math.max(options.limit * 5, options.limit)

    if (!options.query) {
      return this.db.prepare<[string | null, string | null, number], PackageSearchRow & { raw_score: number }>(`
        SELECT
          package_id,
          version_id,
          agent_name,
          version,
          summary,
          instruction,
          description,
          domains,
          tags,
          persona_role,
          compatibility_hosts,
          0 AS raw_score
        FROM package_search
        WHERE (? IS NULL OR compatibility_hosts LIKE ?)
        ORDER BY agent_name ASC
        LIMIT ?
      `).all(hostLike, hostLike, options.limit)
    }

    return this.db.prepare<[string, string | null, string | null, number], PackageSearchRow & { raw_score: number }>(`
      SELECT
        package_id,
        version_id,
        agent_name,
        version,
        summary,
        instruction,
        description,
        domains,
        tags,
        persona_role,
        compatibility_hosts,
        bm25(package_search, 5.0, 1.0, 0.8, 0.8, 0.5, 0.4, 0.4) AS raw_score
      FROM package_search
      WHERE package_search MATCH ?
        AND (? IS NULL OR compatibility_hosts LIKE ?)
      ORDER BY bm25(package_search, 5.0, 1.0, 0.8, 0.8, 0.5, 0.4, 0.4) ASC
      LIMIT ?
    `).all(options.query, hostLike, hostLike, effectiveLimit)
  }

  private listLatestPackageVersions(): LatestPackageVersionRecord[] {
    const rows = this.db.prepare<[], {
      package_name: string
      package_id: string
      id: string
      version: string
      manifest_json: string
      signature: string
      tarball_path: string
      published_at: string
    }>(`
      SELECT
        packages.name AS package_name,
        package_versions.package_id,
        package_versions.id,
        package_versions.version,
        package_versions.manifest_json,
        package_versions.signature,
        package_versions.tarball_path,
        package_versions.published_at
      FROM packages
      JOIN package_versions ON package_versions.package_id = packages.id
      WHERE package_versions.id = (
        SELECT pv.id
        FROM package_versions pv
        WHERE pv.package_id = packages.id
        ORDER BY pv.published_at DESC, pv.rowid DESC
        LIMIT 1
      )
      ORDER BY packages.name ASC
    `).all()

    return rows.map((row) => ({
      packageName: row.package_name,
      versionRow: {
        id: row.id,
        package_id: row.package_id,
        version: row.version,
        manifest_json: row.manifest_json,
        signature: row.signature,
        tarball_path: row.tarball_path,
        published_at: row.published_at,
      },
    }))
  }

  private replaceSearchDocument(
    packageId: string,
    versionRow: PackageVersionRow,
    packageName?: string,
  ): void {
    const manifest = parseStoredManifest(versionRow.manifest_json)
    const agentName = packageName ?? manifest.metadata.name
    const instruction = manifest.metadata.instruction
    const description = manifest.metadata.description ?? ''
    const summary = description || instruction
    const domains = (manifest.metadata.domains ?? []).join(' ')
    const tags = (manifest.metadata.tags ?? []).join(' ')
    const personaRole = manifest.spec.persona?.role ?? ''
    const compatibilityHosts = (manifest.spec.compatibility?.hosts ?? []).join(' ')

    this.db.prepare('DELETE FROM package_search WHERE package_id = ?').run(packageId)
    this.db.prepare(`
      INSERT INTO package_search (
        package_id,
        version_id,
        agent_name,
        version,
        summary,
        instruction,
        description,
        domains,
        tags,
        persona_role,
        compatibility_hosts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      packageId,
      versionRow.id,
      agentName,
      versionRow.version,
      summary,
      instruction,
      description,
      domains,
      tags,
      personaRole,
      compatibilityHosts,
    )
  }
}
