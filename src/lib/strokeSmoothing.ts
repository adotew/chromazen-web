export type StrokePoint = {
  x: number
  y: number
  size: number
  opacity: number
}

const CENTRIPETAL_ALPHA = 0.5
const PARAMETER_EPSILON = 1e-4
const SAMPLE_SPACING = 4
const MAX_SAMPLES_PER_SEGMENT = 32

export class StrokeSmoother {
  private points: StrokePoint[] = []
  private firstSegmentEmitted = false

  begin(point: StrokePoint) {
    this.reset()
    this.points.push(point)
  }

  push(point: StrokePoint): StrokePoint[] {
    const last = this.points.at(-1)
    if (last && samePoint(last, point)) {
      this.points[this.points.length - 1] = point
      return []
    }

    this.points.push(point)

    if (this.points.length <= 2) return []

    if (this.points.length === 3 && !this.firstSegmentEmitted) {
      this.firstSegmentEmitted = true
      return sampleSegment(
        extrapolateBefore(this.points[0], this.points[1]),
        this.points[0],
        this.points[1],
        this.points[2],
      )
    }

    const smoothed = sampleSegment(
      this.points[0],
      this.points[1],
      this.points[2],
      this.points[3],
    )
    this.points.shift()
    return smoothed
  }

  finish(): StrokePoint[] {
    let smoothed: StrokePoint[] = []

    if (this.points.length === 2) {
      smoothed = sampleSegment(
        extrapolateBefore(this.points[0], this.points[1]),
        this.points[0],
        this.points[1],
        extrapolateAfter(this.points[0], this.points[1]),
      )
    } else if (this.firstSegmentEmitted && this.points.length >= 3) {
      const length = this.points.length
      const previous = this.points[length - 3]
      const from = this.points[length - 2]
      const to = this.points[length - 1]
      smoothed = sampleSegment(previous, from, to, extrapolateAfter(from, to))
    }

    this.reset()
    return smoothed
  }

  reset() {
    this.points = []
    this.firstSegmentEmitted = false
  }
}

function sampleSegment(
  p0: StrokePoint,
  p1: StrokePoint,
  p2: StrokePoint,
  p3: StrokePoint,
): StrokePoint[] {
  const samples = Math.min(
    MAX_SAMPLES_PER_SEGMENT,
    Math.max(1, Math.ceil(distance(p1, p2) / SAMPLE_SPACING)),
  )
  const points: StrokePoint[] = []

  for (let index = 1; index <= samples; index += 1) {
    const progress = index / samples
    const position = centripetalCatmullRomPosition(p0, p1, p2, p3, progress)
    points.push({
      x: position.x,
      y: position.y,
      size: lerp(p1.size, p2.size, progress),
      opacity: lerp(p1.opacity, p2.opacity, progress),
    })
  }

  return points
}

function centripetalCatmullRomPosition(
  p0: StrokePoint,
  p1: StrokePoint,
  p2: StrokePoint,
  p3: StrokePoint,
  progress: number,
): Pick<StrokePoint, 'x' | 'y'> {
  if (progress <= 0) return { x: p1.x, y: p1.y }
  if (progress >= 1) return { x: p2.x, y: p2.y }

  const t0 = 0
  const t1 = nextParameter(t0, p0, p1)
  const t2 = nextParameter(t1, p1, p2)
  const t3 = nextParameter(t2, p2, p3)
  const t = lerp(t1, t2, progress)

  const a1 = interpolatePosition(p0, p1, t0, t1, t)
  const a2 = interpolatePosition(p1, p2, t1, t2, t)
  const a3 = interpolatePosition(p2, p3, t2, t3, t)
  const b1 = interpolatePosition(a1, a2, t0, t2, t)
  const b2 = interpolatePosition(a2, a3, t1, t3, t)

  return interpolatePosition(b1, b2, t1, t2, t)
}

function nextParameter(previous: number, from: StrokePoint, to: StrokePoint): number {
  return previous + Math.max(distance(from, to), PARAMETER_EPSILON) ** CENTRIPETAL_ALPHA
}

function interpolatePosition(
  from: Pick<StrokePoint, 'x' | 'y'>,
  to: Pick<StrokePoint, 'x' | 'y'>,
  fromT: number,
  toT: number,
  t: number,
): Pick<StrokePoint, 'x' | 'y'> {
  const denominator = Math.max(toT - fromT, PARAMETER_EPSILON)
  const fromWeight = (toT - t) / denominator
  const toWeight = (t - fromT) / denominator
  return {
    x: from.x * fromWeight + to.x * toWeight,
    y: from.y * fromWeight + to.y * toWeight,
  }
}

function extrapolateBefore(first: StrokePoint, second: StrokePoint): StrokePoint {
  return {
    ...first,
    x: first.x + first.x - second.x,
    y: first.y + first.y - second.y,
  }
}

function extrapolateAfter(previous: StrokePoint, last: StrokePoint): StrokePoint {
  return {
    ...last,
    x: last.x + last.x - previous.x,
    y: last.y + last.y - previous.y,
  }
}

function samePoint(a: StrokePoint, b: StrokePoint): boolean {
  return a.x === b.x && a.y === b.y && a.size === b.size && a.opacity === b.opacity
}

function distance(from: StrokePoint, to: StrokePoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress
}
