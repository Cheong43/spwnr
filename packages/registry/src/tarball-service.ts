import * as tar from 'tar'
import { mkdirSync } from 'fs'
import { dirname, basename } from 'path'

export class TarballService {
  /**
   * Create a .tar.gz from a directory.
   * @param sourceDir - absolute path to the package directory (e.g. /path/to/code-reviewer)
   * @param destPath - absolute path where .tar.gz should be written (e.g. ~/.spwnr/tarballs/code-reviewer/0.1.0.tar.gz)
   */
  async pack(sourceDir: string, destPath: string): Promise<void> {
    mkdirSync(dirname(destPath), { recursive: true })
    await tar.create(
      {
        gzip: true,
        file: destPath,
        cwd: dirname(sourceDir),
      },
      [basename(sourceDir)]
    )
  }

  /**
   * Extract a .tar.gz into a directory.
   * @param tarballPath - absolute path to the .tar.gz
   * @param destDir - absolute path to extract into (will be created)
   */
  async extract(tarballPath: string, destDir: string): Promise<void> {
    mkdirSync(destDir, { recursive: true })
    await tar.extract({
      file: tarballPath,
      cwd: destDir,
      strip: 1,
    })
  }
}
