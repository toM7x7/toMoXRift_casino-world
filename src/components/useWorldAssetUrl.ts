import { useXRift } from '@xrift/world-components'

export function useWorldAssetUrl(path: string) {
  const { baseUrl } = useXRift()
  return `${baseUrl}${path.replace(/^\/+/, '')}`
}
