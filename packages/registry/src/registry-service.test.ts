import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RegistryService } from './registry-service.js'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

interface TestPackageOptions {
  name?: string
  version?: string
  instruction?: string
  description?: string
  domains?: string[]
  tags?: string[]
  personaRole?: string
  compatibilityHosts?: string[]
}

function createTestPackage(dir: string, options: TestPackageOptions = {}) {
  const {
    name = 'test-agent',
    version = '0.1.0',
    instruction = 'Review changes carefully.',
    description,
    domains = [],
    tags = [],
    personaRole,
    compatibilityHosts = ['claude_code'],
  } = options

  mkdirSync(join(dir, 'schemas'), { recursive: true })

  const lines = [
    'apiVersion: spwnr/v1',
    'kind: Subagent',
    'metadata:',
    `  name: ${name}`,
    `  version: ${version}`,
    `  instruction: ${JSON.stringify(instruction)}`,
  ]

  if (description) {
    lines.push(`  description: ${JSON.stringify(description)}`)
  }

  if (domains.length > 0) {
    lines.push('  domains:')
    for (const domain of domains) {
      lines.push(`    - ${domain}`)
    }
  }

  if (tags.length > 0) {
    lines.push('  tags:')
    for (const tag of tags) {
      lines.push(`    - ${tag}`)
    }
  }

  lines.push(
    'spec:',
    '  agent:',
    '    path: ./agent.md',
  )

  if (personaRole) {
    lines.push(
      '  persona:',
      `    role: ${personaRole}`,
    )
  }

  lines.push(
    '  compatibility:',
    '    hosts:',
  )
  for (const host of compatibilityHosts) {
    lines.push(`      - ${host}`)
  }

  lines.push(
    '  schemas:',
    '    input: ./schemas/input.json',
    '    output: ./schemas/output.json',
    '',
  )

  writeFileSync(join(dir, 'subagent.yaml'), lines.join('\n'))
  writeFileSync(join(dir, 'agent.md'), '# Test Agent\n\nReview changes carefully.')
  writeFileSync(join(dir, 'schemas', 'input.json'), '{"type":"object"}')
  writeFileSync(join(dir, 'schemas', 'output.json'), '{"type":"object"}')
}

async function createPublishedPackage(baseDir: string, svc: RegistryService, options: TestPackageOptions) {
  const packageDir = join(baseDir, options.name ?? 'test-agent')
  mkdirSync(packageDir)
  createTestPackage(packageDir, options)
  await svc.publish(packageDir)
}

describe('RegistryService', () => {
  let tmpBase: string
  let dbPath: string
  let svc: RegistryService

  beforeEach(() => {
    tmpBase = join(tmpdir(), randomUUID())
    mkdirSync(tmpBase, { recursive: true })
    process.env.SPWNR_HOME = tmpBase
    dbPath = join(tmpBase, 'test.db')
    svc = new RegistryService(dbPath)
  })

  afterEach(() => {
    svc?.close()
    rmSync(tmpBase, { recursive: true, force: true })
    delete process.env.SPWNR_HOME
  })

  it('publish() returns name, version, signature, tarballPath', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)

    const result = await svc.publish(pkgDir)
    expect(result.name).toBe('test-agent')
    expect(result.version).toBe('0.1.0')
    expect(result.signature).toMatch(/^[a-f0-9]{64}$/)
    expect(result.tarballPath).toMatch(/\.tar\.gz$/)
  })

  it('publish() creates tarball on disk', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)

    const result = await svc.publish(pkgDir)
    expect(existsSync(result.tarballPath)).toBe(true)
  })

  it('publish() throws VERSION_CONFLICT on duplicate version', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)

    await svc.publish(pkgDir)
    await expect(svc.publish(pkgDir)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
  })

  it('list() returns empty array when no packages', () => {
    expect(svc.list()).toEqual([])
  })

  it('list() returns published packages with versions', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const list = svc.list()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('test-agent')
    expect(list[0].versions).toContain('0.1.0')
  })

  it('info() throws PACKAGE_NOT_FOUND for unknown package', () => {
    expect(() => svc.info('no-such-pkg')).toThrowError()
  })

  it('info() returns manifest, signature, publishedAt', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const info = svc.info('test-agent', '0.1.0')
    expect(info.name).toBe('test-agent')
    expect(info.version).toBe('0.1.0')
    expect(info.manifest).toBeDefined()
    expect(info.signature).toMatch(/^[a-f0-9]{64}$/)
    expect(info.publishedAt).toBeDefined()
  })

  it('info() with "latest" returns most recent version', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const info = svc.info('test-agent', 'latest')
    expect(info.version).toBe('0.1.0')
  })

  it('install() extracts package to installed dir', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const result = await svc.install('test-agent', '0.1.0')
    expect(result.installedDir).toBeDefined()
    expect(existsSync(join(result.installedDir, 'subagent.yaml'))).toBe(true)
  })

  it('install() with "latest" resolves to most recent version', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const result = await svc.install('test-agent')
    expect(result.version).toBe('0.1.0')
  })

  it('install() throws PACKAGE_NOT_FOUND for unknown package', async () => {
    await expect(svc.install('no-such-pkg')).rejects.toMatchObject({ code: 'PACKAGE_NOT_FOUND' })
  })

  it('searchPackages() respects host filtering and returns metadata fields', async () => {
    await createPublishedPackage(tmpBase, svc, {
      name: 'backend-developer',
      instruction: 'Build backend services and APIs.',
      description: 'Backend execution specialist.',
      domains: ['Develop'],
      tags: ['backend', 'api'],
      personaRole: 'developer',
      compatibilityHosts: ['claude_code'],
    })
    await createPublishedPackage(tmpBase, svc, {
      name: 'codex-only-agent',
      instruction: 'Codex only package.',
      compatibilityHosts: ['codex'],
    })

    const results = svc.searchPackages({
      host: 'claude_code',
      query: 'backend api',
      limit: 10,
    })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      agentName: 'backend-developer',
      version: '0.1.0',
      summary: 'Backend execution specialist.',
      domains: ['Develop'],
      hosts: ['claude_code'],
    })
  })

  it('searchPackages() prefers but does not require the requested domain', async () => {
    await createPublishedPackage(tmpBase, svc, {
      name: 'platform-engineer',
      instruction: 'Engineer platform tooling and delivery systems.',
      domains: ['Develop'],
      compatibilityHosts: ['claude_code'],
    })
    await createPublishedPackage(tmpBase, svc, {
      name: 'tooling-expert',
      instruction: 'Engineer platform tooling and delivery systems.',
      domains: ['Operate'],
      compatibilityHosts: ['claude_code'],
    })

    const results = svc.searchPackages({
      host: 'claude_code',
      query: 'platform tooling',
      domain: 'Develop',
      limit: 10,
    })

    expect(results.map((result) => result.agentName)).toEqual([
      'platform-engineer',
      'tooling-expert',
    ])
  })

  it('shortlistWorkers() returns task-focused candidates without role scoring', async () => {
    await createPublishedPackage(tmpBase, svc, {
      name: 'fastapi-developer',
      instruction: 'Build FastAPI services and backend endpoints.',
      domains: ['Develop'],
      tags: ['fastapi', 'python'],
      compatibilityHosts: ['claude_code'],
    })
    await createPublishedPackage(tmpBase, svc, {
      name: 'react-specialist',
      instruction: 'Build React interfaces and frontend flows.',
      domains: ['Develop'],
      tags: ['react', 'frontend'],
      compatibilityHosts: ['claude_code'],
    })

    const shortlist = svc.shortlistWorkers({
      role: 'execute',
      host: 'claude_code',
      preferredDomain: 'Develop',
      taskBrief: 'Implement a FastAPI backend service',
      limit: 4,
    })

    expect(shortlist).toMatchObject({
      role: 'execute',
      preferredDomain: 'Develop',
    })
    expect(shortlist.candidates.map((candidate) => candidate.agentName)).toEqual([
      'fastapi-developer',
    ])
  })

  it('buildCoveragePlan() recommends a minimal lineup that covers multiple units', async () => {
    await createPublishedPackage(tmpBase, svc, {
      name: 'api-architect',
      instruction: 'Design and implement backend APIs.',
      domains: ['Develop'],
      tags: ['backend', 'api'],
      compatibilityHosts: ['claude_code'],
    })
    await createPublishedPackage(tmpBase, svc, {
      name: 'qa-auditor',
      instruction: 'Review tests, edge cases, and validation plans.',
      domains: ['Develop'],
      tags: ['qa', 'testing'],
      compatibilityHosts: ['claude_code'],
    })
    await createPublishedPackage(tmpBase, svc, {
      name: 'backend-reviewer',
      instruction: 'Review backend architecture and implementation details.',
      domains: ['Develop'],
      tags: ['backend', 'review'],
      compatibilityHosts: ['claude_code'],
    })

    const coverage = svc.buildCoveragePlan({
      host: 'claude_code',
      preferredDomain: 'Develop',
      units: [
        {
          unitId: 'build-api',
          taskBrief: 'Implement a backend API service',
        },
        {
          unitId: 'review-api',
          taskBrief: 'Review tests and edge cases for the backend API',
        },
      ],
      limit: 4,
    })

    expect(coverage.units).toHaveLength(2)
    expect(coverage.recommendedSelection).toEqual([
      expect.objectContaining({
        agentName: 'api-architect',
        coversUnitIds: ['build-api', 'review-api'],
      }),
    ])
    expect(coverage.uncoveredUnitIds).toEqual([])
  })
})
