import Database from 'better-sqlite3'
import { openDatabase } from './db.js'
import { PackageStore } from './package-store.js'
import { SignatureService } from './signature-service.js'
import { TarballService } from './tarball-service.js'
import { getTarballPath, getInstalledPackageDir } from './artifact-paths.js'
import { loadPackage } from '@orchex/manifest-schema'
import { OrchexError, ErrorCodes } from '@orchex/core-types'
import type { SubagentManifest } from '@orchex/core-types'

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

export class RegistryService {
  private readonly db: Database.Database
  private readonly store: PackageStore
  private readonly signer: SignatureService
  private readonly tarball: TarballService

  constructor(dbPath?: string) {
    this.db = openDatabase(dbPath)
    this.store = new PackageStore(this.db)
    this.signer = new SignatureService()
    this.tarball = new TarballService()
  }

  async publish(packageDir: string): Promise<PublishResult> {
    const result = loadPackage(packageDir)
    if (!result.success) {
      throw new OrchexError(ErrorCodes.MANIFEST_INVALID, result.error.message, result.error)
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
      throw new OrchexError(
        ErrorCodes.PACKAGE_NOT_FOUND,
        `Package ${packageName}@${version === 'latest' ? 'latest' : version} not found`,
      )
    }

    const installedDir = getInstalledPackageDir(packageName, versionRow.version)
    await this.tarball.extract(versionRow.tarball_path, installedDir)

    const manifest = JSON.parse(versionRow.manifest_json) as SubagentManifest
    const isValid = this.signer.verify(manifest, versionRow.signature)
    if (!isValid) {
      throw new OrchexError(
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
      throw new OrchexError(
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

  close(): void {
    this.db.close()
  }
}
