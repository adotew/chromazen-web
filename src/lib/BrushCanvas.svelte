<script lang="ts">
  import { onMount } from 'svelte'
  import { createBrushRenderer, type BrushRenderer } from './brushRenderer'

  const BRUSH_SIZE = 112
  const DRAW_FLOATS_PER_STAMP = 4
  const STATE_FLOATS_PER_STAMP = 5
  const FADE_DURATION = 1200
  const MAX_STAMPS = 2048

  type Point = {
    x: number
    y: number
    size: number
    opacity: number
    pointerId: number
  }

  let canvas: HTMLCanvasElement

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let renderer: BrushRenderer | null = null
    let previousPoint: Point | null = null
    let activeStampCount = 0
    let animationFrame = 0
    let initializationVersion = 0
    let mounted = true
    const activeStamps = new Float32Array(MAX_STAMPS * STATE_FLOATS_PER_STAMP)
    const drawStamps = new Float32Array(MAX_STAMPS * DRAW_FLOATS_PER_STAMP)

    function resize() {
      renderer?.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio, 2))
    }

    function drawFrame(timestamp: number) {
      animationFrame = 0
      let nextActiveCount = 0
      let drawCount = 0

      for (let index = 0; index < activeStampCount; index += 1) {
        const stateOffset = index * STATE_FLOATS_PER_STAMP
        const age = timestamp - activeStamps[stateOffset + 4]
        if (age >= FADE_DURATION) continue

        const nextStateOffset = nextActiveCount * STATE_FLOATS_PER_STAMP
        if (nextStateOffset !== stateOffset) {
          for (let value = 0; value < STATE_FLOATS_PER_STAMP; value += 1) {
            activeStamps[nextStateOffset + value] = activeStamps[stateOffset + value]
          }
        }

        const drawOffset = drawCount * DRAW_FLOATS_PER_STAMP
        const remainingOpacity = 1 - Math.max(0, age) / FADE_DURATION
        drawStamps[drawOffset] = activeStamps[stateOffset]
        drawStamps[drawOffset + 1] = activeStamps[stateOffset + 1]
        drawStamps[drawOffset + 2] = activeStamps[stateOffset + 2]
        drawStamps[drawOffset + 3] = activeStamps[stateOffset + 3] * remainingOpacity
        nextActiveCount += 1
        drawCount += 1
      }

      activeStampCount = nextActiveCount
      renderer?.clear()
      renderer?.draw(drawStamps, drawCount)

      if (activeStampCount > 0) animationFrame = requestAnimationFrame(drawFrame)
    }

    function queueStamp(x: number, y: number, size: number, opacity: number) {
      if (!renderer || activeStampCount >= MAX_STAMPS) return

      const offset = activeStampCount * STATE_FLOATS_PER_STAMP
      activeStamps[offset] = x
      activeStamps[offset + 1] = y
      activeStamps[offset + 2] = size
      activeStamps[offset + 3] = opacity
      activeStamps[offset + 4] = performance.now()
      activeStampCount += 1

      if (!animationFrame) animationFrame = requestAnimationFrame(drawFrame)
    }

    function pointFromEvent(event: PointerEvent): Point {
      const usesPressure = event.pointerType === 'pen' && event.pressure > 0
      const pressure = usesPressure ? event.pressure : 1

      return {
        x: event.clientX,
        y: event.clientY,
        size: BRUSH_SIZE * (0.55 + pressure * 0.45),
        opacity: 0.2 + pressure * 0.25,
        pointerId: event.pointerId,
      }
    }

    function queuePoint(point: Point) {
      if (!previousPoint || previousPoint.pointerId !== point.pointerId) {
        queueStamp(point.x, point.y, point.size, point.opacity)
        previousPoint = point
        return
      }

      const dx = point.x - previousPoint.x
      const dy = point.y - previousPoint.y
      const distance = Math.hypot(dx, dy)
      const spacing = Math.max(3, point.size * 0.12)
      const steps = Math.max(1, Math.ceil(distance / spacing))

      for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps
        queueStamp(
          previousPoint.x + dx * progress,
          previousPoint.y + dy * progress,
          previousPoint.size + (point.size - previousPoint.size) * progress,
          previousPoint.opacity + (point.opacity - previousPoint.opacity) * progress,
        )
      }

      previousPoint = point
    }

    function handlePointerMove(event: PointerEvent) {
      const events = event.getCoalescedEvents?.() ?? [event]
      for (const pointerEvent of events) queuePoint(pointFromEvent(pointerEvent))
    }

    function handlePointerEnd(event: PointerEvent) {
      if (previousPoint?.pointerId === event.pointerId) previousPoint = null
    }

    function handleContextLost(event: Event) {
      event.preventDefault()
      initializationVersion += 1
      renderer = null
      previousPoint = null
      activeStampCount = 0
      if (animationFrame) cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }

    function handleVisibilityChange() {
      if (!document.hidden) return

      previousPoint = null
      activeStampCount = 0
      renderer?.clear()
      if (animationFrame) cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }

    async function initializeRenderer() {
      const version = ++initializationVersion

      try {
        const createdRenderer = await createBrushRenderer(canvas, '/charcoal.png')
        if (!mounted || version !== initializationVersion) {
          createdRenderer?.destroy()
          return
        }

        renderer = createdRenderer
        resize()
      } catch (error: unknown) {
        if (mounted && version === initializationVersion) {
          console.warn('The brush effect could not be initialized.', error)
        }
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerEnd, { passive: true })
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true })
    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', initializeRenderer)

    void initializeRenderer()

    return () => {
      mounted = false
      initializationVersion += 1
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', initializeRenderer)
      if (animationFrame) cancelAnimationFrame(animationFrame)
      renderer?.destroy()
    }
  })
</script>

<canvas bind:this={canvas} class="brush-canvas" aria-hidden="true"></canvas>

<style>
  .brush-canvas {
    position: fixed;
    z-index: 0;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
