import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getTarballPath, getInstalledPackageDir } from './artifact-paths.js'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

describe('artifact-paths', () => {
  let originalHome: string | undefined

  beforeEach(() => {
    originalHome = process.env.SPWNR_HOME
  })

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.SPWNR_HOME
    } else {
      process.env.SPWNR_HOME = originalHome
    }
  })

  it('getTarballPath returns path under SPWNR_HOME/tarballs', () => {
    const home = join(tmpdir(), randomUUID())
    process.env.SPWNR_HOME = home
    expect(getTarballPath('code-reviewer', '0.1.0')).toBe(
      join(home, 'tarballs', 'code-reviewer', '0.1.0.tar.gz')
    )
  })

  it('getTarballPath uses .tar.gz extension', () => {
    process.env.SPWNR_HOME = join(tmpdir(), randomUUID())
    expect(getTarballPath('my-pkg', '1.2.3')).toMatch(/\.tar\.gz$/)
  })

  it('getInstalledPackageDir returns path under SPWNR_HOME/packages', () => {
    const home = join(tmpdir(), randomUUID())
    process.env.SPWNR_HOME = home
    expect(getInstalledPackageDir('code-reviewer', '0.1.0')).toBe(
      join(home, 'packages', 'code-reviewer', '0.1.0')
    )
  })

  it('getInstalledPackageDir includes version in path', () => {
    process.env.SPWNR_HOME = join(tmpdir(), randomUUID())
    expect(getInstalledPackageDir('my-pkg', '2.0.0')).toMatch(/2\.0\.0$/)
  })
})
