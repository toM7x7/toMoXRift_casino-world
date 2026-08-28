# XRift TTS investigation v21

Status: design and feasibility review only. No runtime TTS has been added.

## Evidence collected

- The installed `@xrift/world-components` is `0.46.0`. Its public hooks include voice-chat volume control, but no TTS or speech-synthesis wrapper.
- A workspace source search found no `speechSynthesis` or `SpeechSynthesisUtterance` implementation in the local XRift worlds.
- Public GitHub code search found no open XRift world source using those identifiers.
- The Codex in-app local browser reports both `window.speechSynthesis` and `window.SpeechSynthesisUtterance` as `undefined`.
- The Web Speech API itself is a browser API. Voice availability is user-agent and device dependent, and voices may arrive asynchronously through `voiceschanged`.

The exact implementation used by the worlds the user saw cannot be identified without a world URL or name. The most likely implementations are below.

## Likely implementation patterns

### A. Browser-native Web Speech API

```ts
const utterance = new SpeechSynthesisUtterance(text)
utterance.lang = 'ja-JP'
utterance.rate = 1.05
window.speechSynthesis.cancel()
window.speechSynthesis.speak(utterance)
```

Characteristics:

- No XRift-specific hook is required.
- Arbitrary text can be spoken immediately.
- Output is local and non-spatial; it does not originate from an NPC position.
- Voice quality and Japanese voice availability vary by desktop/Quest/browser.
- A local preview wrapper may hide the API even if the deployed host browser exposes it.

### B. Pre-generated announcer audio

Characteristics:

- WAV/MP3 files are loaded through `useXRift().baseUrl` and played with Three.js or Drei audio.
- Voice is consistent across devices and can be positional.
- It may look like TTS, but only a fixed phrase bank is available.
- This is the safest fallback for countdowns, racer names, wins, and losses.

### C. External TTS service

Characteristics:

- Text is sent to an API and an audio response is decoded and played.
- Dynamic and consistent voice; audio can be placed in 3D after decoding.
- Requires an explicit backend, domain permissions, latency handling, caching, cost control, and failure fallback.
- Secrets must never be embedded in the world bundle.

## How to identify a live world's method

1. Search its loaded world chunks for `SpeechSynthesisUtterance` and `speechSynthesis`.
2. Observe network requests when a new sentence is spoken.
   - no audio request: probably browser-native synthesis;
   - MP3/WAV/stream request: generated or external TTS.
3. Move around the speaker.
   - fixed in the listener's head: browser-native synthesis;
   - volume/pan changes with distance: decoded audio through positional playback.
4. Compare desktop and Quest voices.
   - different voices: likely browser-native;
   - identical voice: likely generated audio.

## Proposed casino narration adapter

```ts
interface CasinoNarrator {
  available: boolean
  spatial: boolean
  speak(text: string, roundToken: string): Promise<'spoken' | 'fallback'>
  cancel(): void
}
```

Priority order:

1. Browser-native Japanese voice when the deployed browser exposes it.
2. Local phrase-bank fallback for required game cues.
3. Optional external cached TTS for richer commentary in a later release.

Runtime rules:

- Captions are always rendered; speech is enhancement, never the only information channel.
- Keep one spoken queue per client and cancel stale lines when the round changes.
- Guard every line with the existing round token so React re-renders cannot duplicate speech.
- Detect `ja-JP` voices after both the initial `getVoices()` call and `voiceschanged`.
- Duck the casino BGM while narration is active and restore it on `end` or `error`.
- Limit pre-race commentary to short deterministic facts that match the actual round state.

## Required proof matrix before adoption

| Surface | Capability check | Audio check | Result required |
| --- | --- | --- | --- |
| Codex local preview | API detection | fallback clip | graceful fallback |
| Deployed XRift in desktop Chrome | `ja-JP` voice list | one user-triggered line | spoken once |
| Deployed XRift in Quest browser | API and voice list | immersive session | spoken once or fallback |
| Two-player instance | same round token | per-client output | no duplicate queue |

The next safe step is a small `TTS診断` station or isolated diagnostic mode. It should report capability and voice names, speak one fixed Japanese line after interaction, and fall back to a local clip. It should be tested before connecting narration to coin settlement or round progression.
