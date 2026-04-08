import { describe, it, expect } from 'vitest'
import { Command } from 'commander'

describe('CLI base', () => {
  it('creates a program with correct name', () => {
    const p = new Command()
    p.name('spwnr').description('Spwnr — Agent package manager').version('0.1.0')
    expect(p.name()).toBe('spwnr')
  })

  it('has version 0.1.0', () => {
    const p = new Command()
    p.name('spwnr').version('0.1.0')
    expect(p.version()).toBe('0.1.0')
  })

  it('registerCommands is a function', async () => {
    const { registerCommands } = await import('./commands/index.js')
    expect(typeof registerCommands).toBe('function')
  })
})
