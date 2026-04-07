import { join } from 'path'
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs'
import { getOrchexHome } from './db.js'

export class ArtifactStore {
  private getDir(runId: string): string {
    return join(getOrchexHome(), 'artifacts', runId)
  }

  write(runId: string, filename: string, content: string | Buffer): string {
    const dir = this.getDir(runId)
    mkdirSync(dir, { recursive: true })
    const fullPath = join(dir, filename)
    writeFileSync(fullPath, content)
    return fullPath
  }

  read(runId: string, filename: string): Buffer | null {
    const fullPath = join(this.getDir(runId), filename)
    if (!existsSync(fullPath)) return null
    return readFileSync(fullPath)
  }

  list(runId: string): string[] {
    const dir = this.getDir(runId)
    if (!existsSync(dir)) return []
    return readdirSync(dir)
  }

  dir(runId: string): string {
    return this.getDir(runId)
  }
}
