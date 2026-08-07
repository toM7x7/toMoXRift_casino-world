import type { Camera, Object3D } from 'three'
import ui from '../design/responsive-ui-v8.json'

type CanvasSize = {
  width: number
  height: number
}

export function screenCenter(
  _object: Object3D,
  _camera: Camera,
  size: CanvasSize,
): [number, number] {
  return [size.width / 2, size.height / 2]
}

export function getScreenProfile(width: number, height: number) {
  const narrow = width <= ui.breakpoints.narrowMaxWidth
  const compact = width <= ui.breakpoints.compactMaxWidth
    || height <= ui.breakpoints.shortMaxHeight

  return {
    narrow,
    compact,
    topSafe: compact ? ui.safeAreas.compact.top : ui.safeAreas.desktop.top,
    sideSafe: compact ? ui.safeAreas.compact.left : ui.safeAreas.desktop.left,
    gameDockBottom: compact
      ? ui.gameDock.compactBottom
      : ui.gameDock.desktopBottom,
    seatedPanel: compact ? ui.seatedPanel.compact : ui.seatedPanel.desktop,
    seatedPanelZIndex: ui.seatedPanel.zIndex,
  }
}
