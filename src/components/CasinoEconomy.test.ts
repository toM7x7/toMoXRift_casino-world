import { describe, expect, it, vi } from 'vitest'
import {
  isStorageUnavailable,
  resolveWalletPersistenceSource,
} from './CasinoEconomy'

describe('casino wallet persistence fallback', () => {
  it.each(['UNAUTHORIZED', 'NOT_IN_WORLD'])('uses the session wallet for %s', async (code) => {
    const write = vi.fn().mockRejectedValue(Object.assign(new Error(code), { code }))

    await expect(resolveWalletPersistenceSource('world-storage', write))
      .resolves.toBe('local-preview')
    expect(write).toHaveBeenCalledOnce()
  })

  it('keeps World Storage when persistence succeeds', async () => {
    const write = vi.fn().mockResolvedValue(undefined)

    await expect(resolveWalletPersistenceSource('world-storage', write))
      .resolves.toBe('world-storage')
  })

  it('does not hide unrelated storage failures', async () => {
    const error = Object.assign(new Error('rate limited'), { code: 'RATE_LIMITED' })

    expect(isStorageUnavailable(error)).toBe(false)
    await expect(resolveWalletPersistenceSource('world-storage', () => Promise.reject(error)))
      .rejects.toBe(error)
  })
})
