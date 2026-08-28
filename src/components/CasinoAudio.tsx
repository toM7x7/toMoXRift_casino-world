import { PositionalAudio } from '@react-three/drei'
import { useXRift } from '@xrift/world-components'
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { PositionalAudio as ThreePositionalAudio } from 'three'
import { CasinoButton } from './CasinoPrimitives'

export type CasinoSound = 'select' | 'bet' | 'countdown' | 'wheel' | 'race' | 'win' | 'lose'

interface CasinoAudioValue {
  musicEnabled: boolean
  musicStarted: boolean
  play: (sound: CasinoSound) => void
  toggleMusic: () => void
}

const CasinoAudioContext = createContext<CasinoAudioValue | null>(null)

async function resumeAndPlay(audio: ThreePositionalAudio | null, restart = true) {
  if (!audio) return false
  if (audio.context.state === 'suspended') await audio.context.resume()
  if (audio.isPlaying) {
    if (!restart) return true
    audio.stop()
  }
  audio.play()
  return true
}

export function CasinoAudioProvider({ children }: { children: ReactNode }) {
  const { baseUrl } = useXRift()
  const musicRef = useRef<ThreePositionalAudio>(null)
  const selectRef = useRef<ThreePositionalAudio>(null)
  const betRef = useRef<ThreePositionalAudio>(null)
  const countdownRef = useRef<ThreePositionalAudio>(null)
  const wheelRef = useRef<ThreePositionalAudio>(null)
  const raceRef = useRef<ThreePositionalAudio>(null)
  const winRef = useRef<ThreePositionalAudio>(null)
  const loseRef = useRef<ThreePositionalAudio>(null)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [musicStarted, setMusicStarted] = useState(false)

  const startMusic = useCallback(async () => {
    if (!musicEnabled) return
    const started = await resumeAndPlay(musicRef.current, false)
    if (started) setMusicStarted(true)
  }, [musicEnabled])

  const play = useCallback((sound: CasinoSound) => {
    void startMusic()
    const refs: Record<CasinoSound, React.RefObject<ThreePositionalAudio | null>> = {
      select: selectRef,
      bet: betRef,
      countdown: countdownRef,
      wheel: wheelRef,
      race: raceRef,
      win: winRef,
      lose: loseRef,
    }
    void resumeAndPlay(refs[sound].current)
  }, [startMusic])

  const toggleMusic = useCallback(() => {
    if (musicEnabled && musicStarted) {
      if (musicRef.current?.isPlaying) musicRef.current.stop()
      setMusicEnabled(false)
      setMusicStarted(false)
      return
    }
    setMusicEnabled(true)
    const audio = musicRef.current
    if (!audio) return
    void resumeAndPlay(audio, false).then((started) => {
      if (started) setMusicStarted(true)
    })
  }, [musicEnabled, musicStarted])

  const value = useMemo(
    () => ({ musicEnabled, musicStarted, play, toggleMusic }),
    [musicEnabled, musicStarted, play, toggleMusic],
  )

  return (
    <CasinoAudioContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <group position={[0, 2, 0]}>
          <PositionalAudio ref={(audio) => { musicRef.current = audio; audio?.setVolume(0.12) }} url={`${baseUrl}casino-bgm.wav`} distance={150} loop />
          <PositionalAudio ref={(audio) => { selectRef.current = audio; audio?.setVolume(0.28) }} url={`${baseUrl}sfx-select.wav`} distance={150} loop={false} />
          <PositionalAudio ref={(audio) => { betRef.current = audio; audio?.setVolume(0.34) }} url={`${baseUrl}sfx-bet.wav`} distance={150} loop={false} />
          <PositionalAudio ref={(audio) => { countdownRef.current = audio; audio?.setVolume(0.38) }} url={`${baseUrl}sfx-countdown.wav`} distance={150} loop={false} />
          <PositionalAudio ref={(audio) => { wheelRef.current = audio; audio?.setVolume(0.34) }} url={`${baseUrl}sfx-wheel-spin.wav`} distance={150} loop={false} />
          <PositionalAudio ref={(audio) => { raceRef.current = audio; audio?.setVolume(0.36) }} url={`${baseUrl}sfx-race-start.wav`} distance={150} loop={false} />
          <PositionalAudio ref={(audio) => { winRef.current = audio; audio?.setVolume(0.38) }} url={`${baseUrl}sfx-win.wav`} distance={150} loop={false} />
          <PositionalAudio ref={(audio) => { loseRef.current = audio; audio?.setVolume(0.3) }} url={`${baseUrl}sfx-lose.wav`} distance={150} loop={false} />
        </group>
      </Suspense>
    </CasinoAudioContext.Provider>
  )
}

export function useCasinoAudio() {
  const value = useContext(CasinoAudioContext)
  if (!value) throw new Error('useCasinoAudio must be used within CasinoAudioProvider')
  return value
}

export function CasinoAudioControl({ position }: { position: [number, number, number] }) {
  const { musicEnabled, musicStarted, toggleMusic } = useCasinoAudio()
  const label = musicEnabled && musicStarted
    ? '♪ BGM：ON'
    : musicEnabled
      ? '♪ BGMを開始'
      : '♪ BGM：OFF'
  return (
    <CasinoButton
      id="casino-bgm-toggle"
      label={label}
      detail="クリックで切替"
      position={position}
      width={1.8}
      height={0.52}
      color="#6d4aa8"
      onPress={toggleMusic}
    />
  )
}
