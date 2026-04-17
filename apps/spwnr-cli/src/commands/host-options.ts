import { HostScope, HostType } from '@spwnr/core-types'

const HOST_TYPES = Object.values(HostType)
const HOST_SCOPES = Object.values(HostScope)

function isHostType(value: string): value is HostType {
  return HOST_TYPES.some((hostType) => hostType === value)
}

function isHostScope(value: string): value is HostScope {
  return HOST_SCOPES.some((hostScope) => hostScope === value)
}

export function parseHostType(value: string): HostType {
  if (isHostType(value)) {
    return value
  }

  throw new Error(`Invalid host value: ${value}`)
}

export function parseHostScope(value: string): HostScope {
  if (isHostScope(value)) {
    return value
  }

  throw new Error(`Invalid scope value: ${value}`)
}
