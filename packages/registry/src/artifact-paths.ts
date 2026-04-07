import { join } from 'path'
import { getOrchexHome } from './db.js'

/** Returns the path where tarballs for a package version are stored. */
export function getTarballPath(packageName: string, version: string): string {
  return join(getOrchexHome(), 'tarballs', packageName, `${version}.tar.gz`)
}

/** Returns the directory where a package version is installed. */
export function getInstalledPackageDir(packageName: string, version: string): string {
  return join(getOrchexHome(), 'packages', packageName, version)
}
