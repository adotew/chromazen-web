export type BrushRenderer = {
  clear: () => void
  destroy: () => void
  draw: (stamps: Float32Array, count: number) => void
  resize: (width: number, height: number, pixelRatio: number) => void
}

const FLOATS_PER_STAMP = 4

const vertexShaderSource = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in float a_size;
layout(location = 2) in float a_opacity;

uniform vec2 u_viewport;

out vec2 v_texture_coordinate;
out float v_opacity;

const vec2 QUAD[6] = vec2[](
  vec2(-0.5, -0.5),
  vec2(0.5, -0.5),
  vec2(-0.5, 0.5),
  vec2(-0.5, 0.5),
  vec2(0.5, -0.5),
  vec2(0.5, 0.5)
);

void main() {
  vec2 corner = QUAD[gl_VertexID];
  vec2 position = a_position + corner * a_size;
  vec2 clip_position = vec2(
    (position.x / u_viewport.x) * 2.0 - 1.0,
    1.0 - (position.y / u_viewport.y) * 2.0
  );

  gl_Position = vec4(clip_position, 0.0, 1.0);
  v_texture_coordinate = corner + 0.5;
  v_opacity = a_opacity;
}
`

const fragmentShaderSource = `#version 300 es
precision mediump float;

uniform sampler2D u_brush;

in vec2 v_texture_coordinate;
in float v_opacity;
out vec4 out_color;

void main() {
  float alpha = texture(u_brush, v_texture_coordinate).a * v_opacity;
  if (alpha < 0.01) {
    discard;
  }

  out_color = vec4(0.09, 0.085, 0.075, alpha);
}
`

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create WebGL shader')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compilation error'
    gl.deleteShader(shader)
    throw new Error(message)
  }

  return shader
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
  const program = gl.createProgram()

  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error('Unable to create WebGL program')
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown WebGL program link error'
    gl.deleteProgram(program)
    throw new Error(message)
  }

  return program
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load brush texture: ${source}`))
    image.src = source
  })
}

export async function createBrushRenderer(
  canvas: HTMLCanvasElement,
  textureSource: string,
): Promise<BrushRenderer | null> {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: false,
  })

  if (!gl) return null

  const program = createProgram(gl)
  const buffer = gl.createBuffer()
  const texture = gl.createTexture()
  const vertexArray = gl.createVertexArray()
  const brushLocation = gl.getUniformLocation(program, 'u_brush')
  const viewportLocation = gl.getUniformLocation(program, 'u_viewport')

  if (!buffer || !texture || !vertexArray || !brushLocation || !viewportLocation) {
    gl.deleteBuffer(buffer)
    gl.deleteTexture(texture)
    gl.deleteVertexArray(vertexArray)
    gl.deleteProgram(program)
    throw new Error('Unable to create WebGL brush resources')
  }

  try {
    const image = await loadImage(textureSource)

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

    gl.useProgram(program)
    gl.uniform1i(brushLocation, 0)
    gl.bindVertexArray(vertexArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    const stride = FLOATS_PER_STAMP * Float32Array.BYTES_PER_ELEMENT
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0)
    gl.vertexAttribDivisor(0, 1)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT)
    gl.vertexAttribDivisor(1, 1)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT)
    gl.vertexAttribDivisor(2, 1)

    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
  } catch (error) {
    gl.deleteBuffer(buffer)
    gl.deleteTexture(texture)
    gl.deleteVertexArray(vertexArray)
    gl.deleteProgram(program)
    throw error
  }

  let width = 1
  let height = 1
  let pixelRatio = 1

  return {
    clear() {
      gl.clear(gl.COLOR_BUFFER_BIT)
    },

    destroy() {
      gl.deleteBuffer(buffer)
      gl.deleteTexture(texture)
      gl.deleteVertexArray(vertexArray)
      gl.deleteProgram(program)
    },

    draw(stamps, count) {
      if (count <= 0) return

      gl.useProgram(program)
      gl.uniform2f(viewportLocation, width, height)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.bindVertexArray(vertexArray)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        stamps.subarray(0, count * FLOATS_PER_STAMP),
        gl.DYNAMIC_DRAW,
      )
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count)
    },

    resize(nextWidth, nextHeight, nextPixelRatio) {
      width = Math.max(1, nextWidth)
      height = Math.max(1, nextHeight)
      pixelRatio = Math.max(1, nextPixelRatio)

      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
    },
  }
}
