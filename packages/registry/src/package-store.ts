import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { OrchexError, ErrorCodes } from '@orchex/core-types'
import type { SubagentManifest } from '@orchex/core-types'

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

export class PackageStore {
  constructor(private readonly db: Database.Database) {}

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
      opts.manifest.metadata?.description,
    )

    const existing = this.db
      .prepare<[string, string], PackageVersionRow>(
        'SELECT * FROM package_versions WHERE package_id = ? AND version = ?',
      )
      .get(packageId, opts.version)

    if (existing) {
      throw new OrchexError(
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
}
