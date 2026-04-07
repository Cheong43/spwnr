import { createHash } from 'crypto'
import type { SubagentManifest } from '@orchex/core-types'

export class SignatureService {
  /**
   * Sign a manifest: returns SHA-256 hex of JSON.stringify(manifest).
   */
  sign(manifest: SubagentManifest): string {
    return createHash('sha256')
      .update(JSON.stringify(manifest))
      .digest('hex')
  }

  /**
   * Verify a manifest against a previously generated signature.
   */
  verify(manifest: SubagentManifest, signature: string): boolean {
    return this.sign(manifest) === signature
  }
}
