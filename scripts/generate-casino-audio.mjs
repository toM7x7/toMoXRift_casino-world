import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = resolve(projectRoot, 'public')
const sampleRate = 22050
let noiseState = 0x51f15e

mkdirSync(outputDir, { recursive: true })

function clamp(value) {
  return Math.max(-1, Math.min(1, value))
}

function sine(frequency, time) {
  return Math.sin(Math.PI * 2 * frequency * time)
}

function square(frequency, time) {
  return sine(frequency, time) >= 0 ? 1 : -1
}

function triangle(frequency, time) {
  return 2 * Math.asin(sine(frequency, time)) / Math.PI
}

function noise() {
  noiseState = (noiseState * 1664525 + 1013904223) >>> 0
  return (noiseState / 0xffffffff) * 2 - 1
}

function envelope(time, duration, attack = 0.02, release = 0.12) {
  const fadeIn = Math.min(1, time / Math.max(0.001, attack))
  const fadeOut = Math.min(1, (duration - time) / Math.max(0.001, release))
  return Math.max(0, Math.min(fadeIn, fadeOut))
}

function writeWav(fileName, duration, render) {
  const sampleCount = Math.floor(duration * sampleRate)
  const dataSize = sampleCount * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate
    const value = clamp(render(time, duration))
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2)
  }
  writeFileSync(resolve(outputDir, fileName), buffer)
}

// Bright C-major casino promenade: no low drone, minor cadence, or tritone.
const melody = [
  523.25, 659.25, 783.99, 659.25,
  698.46, 880, 1046.5, 880,
  783.99, 987.77, 1174.66, 987.77,
  659.25, 783.99, 1046.5, 783.99,
  523.25, 587.33, 659.25, 783.99,
  880, 783.99, 698.46, 659.25,
  587.33, 698.46, 783.99, 987.77,
  1046.5, 783.99, 659.25, 523.25,
]
const bass = [130.81, 130.81, 174.61, 174.61, 196, 196, 130.81, 196, 130.81, 164.81, 174.61, 196, 220, 196, 174.61, 130.81]

writeWav('casino-bgm.wav', 32, (time) => {
  const loopTime = time % 16
  const melodyStep = Math.floor(loopTime / 0.5) % melody.length
  const melodyTime = loopTime % 0.5
  const bassStep = Math.floor(loopTime) % bass.length
  const bassTime = loopTime % 1
  const chordRoot = bass[bassStep] * 2
  const melodyVoice = (triangle(melody[melodyStep], time) * 0.7 + sine(melody[melodyStep] * 2, time) * 0.3)
    * envelope(melodyTime, 0.5, 0.012, 0.13)
    * 0.18
  const bassVoice = triangle(bass[bassStep], time)
    * envelope(bassTime, 1, 0.018, 0.13)
    * 0.055
  const offBeat = loopTime % 0.5
  const chord = (triangle(chordRoot, time) + triangle(chordRoot * 1.25, time) + triangle(chordRoot * 1.5, time))
    * envelope(offBeat, 0.5, 0.015, 0.12)
    * (Math.floor(loopTime / 0.5) % 2 === 1 ? 0.026 : 0.009)
  const beat = loopTime % 0.5
  const percussion = noise()
    * Math.exp(-beat * 52)
    * (Math.floor(loopTime / 0.5) % 2 === 0 ? 0.026 : 0.014)
  const sparkle = sine(1567.98, time) * Math.exp(-(loopTime % 2) * 28) * 0.018
  return melodyVoice + bassVoice + chord + percussion + sparkle
})

writeWav('sfx-select.wav', 0.16, (time, duration) => (
  sine(660 + time * 900, time) * envelope(time, duration, 0.005, 0.08) * 0.34
))

writeWav('sfx-bet.wav', 0.34, (time, duration) => {
  const frequency = time < 0.12 ? 740 : time < 0.23 ? 988 : 1318
  return triangle(frequency, time) * envelope(time, duration, 0.004, 0.08) * 0.38
})

writeWav('sfx-countdown.wav', 0.82, (time, duration) => {
  const notes = [659.25, 783.99, 1046.5]
  const step = Math.min(notes.length - 1, Math.floor(time / 0.24))
  const stepTime = time % 0.24
  return (triangle(notes[step], time) * 0.24 + sine(notes[step] * 2, time) * 0.09)
    * envelope(stepTime, 0.24, 0.006, 0.1)
    * envelope(time, duration, 0.004, 0.1)
})

writeWav('sfx-wheel-spin.wav', 1.35, (time, duration) => {
  const motor = triangle(120 + time * 220, time) * 0.12
  const tickPhase = (time * (8 + time * 15)) % 1
  const tick = noise() * Math.exp(-tickPhase * 30) * 0.28
  return (motor + tick) * envelope(time, duration, 0.03, 0.24)
})

writeWav('sfx-race-start.wav', 0.9, (time, duration) => {
  const frequency = time < 0.28 ? 196 : time < 0.56 ? 247 : 392
  return (square(frequency, time) * 0.22 + sine(frequency * 2, time) * 0.14)
    * envelope(time, duration, 0.02, 0.18)
})

writeWav('sfx-win.wav', 1.25, (time, duration) => {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
  const step = Math.min(notes.length - 1, Math.floor(time / 0.22))
  const stepTime = time % 0.22
  return (triangle(notes[step], time) * 0.3 + sine(notes[step] * 2, time) * 0.1)
    * envelope(stepTime, 0.22, 0.008, 0.09)
    * envelope(time, duration, 0.005, 0.15)
})

writeWav('sfx-lose.wav', 0.72, (time, duration) => {
  const frequency = 320 - time * 210
  return triangle(frequency, time) * envelope(time, duration, 0.01, 0.22) * 0.3
})

console.log('Generated bright casino BGM and SFX in public/.')
