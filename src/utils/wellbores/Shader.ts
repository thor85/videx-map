import * as PIXI from 'pixi.js';
import { Color, ColorOffset, createColormapTexture } from './Colors';

type vec3 = [number, number, number];

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// SHARED LOGIC

/** Stringify number for shader. If whole number, ensure one decimal slot. */
export function toShader(n: number): string {
  if(n - Math.floor(n) === 0) return n.toString() + '.0';
  else return n.toString();
}

function machineIsLittleEndian() {
  const uint8Array = new Uint8Array([0xAA, 0xBB]);
  const uint16array = new Uint16Array(uint8Array.buffer);
  return uint16array[0] === 0xBBAA;
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// WELLBORE SHADER

/** Uniforms used by the shader. */
export interface WellboreUniforms {
  /** Color of lighted wellbore on the format: [R, G, B]. */
  wellboreColor1: vec3,
/** Color of shaded wellbore on the format: [R, G, B]. */
  wellboreColor2: vec3,
  /** True if completion and ticks should be visible. */
  completionVisible: boolean,
  /** True if wellbore should be visible. */
  wellboreVisible: boolean,
  /* Color wellbore by log values */
  colorByLog: boolean,
  /* Force wellbore color instead of coloring by log value*/
  forceColor: boolean,
  /* Status of wellbore. (0: Active, 1: Filtered, 2: Ghost, 3: Hidden) */
  status: number,
  /* Hide path with no log interval */
  hidePathWithoutInterval: boolean,
  /* Shading of wellbore */
  shadeWellbore: boolean,
}

/**
 * Get shader for wellbore.
 * @param color Color used for wellbore
 * @param wellboreWidth Width of wellbore
 * @return PIXI shader
 */
export function getWellboreShader(
  color: Color,
  completionVisible: boolean,
  wellboreVisible: boolean,
  colorByLog: boolean,
  hidePathWithoutInterval: boolean,
  shadeWellbore: boolean,
  logColormap: ColorOffset[],
): PIXI.Shader {
  const sentinelColormap = createColormapTexture(logColormap);

  return PIXI.Shader.from(
    WellboreShader.vertexShader,
    WellboreShader.fragmentShader,
    {
      wellboreColor1: color.col1,
      wellboreColor2: color.col2,
      completionVisible: completionVisible,
      wellboreVisible: wellboreVisible,
      colorByLog: colorByLog,
      forceColor: false,
      status: 0,
      sentinelLength: Object.keys(logColormap).length + 1,
      sentinelColormap: sentinelColormap,
      hidePathWithoutInterval: hidePathWithoutInterval,
      shadeWellbore: shadeWellbore,
    } as WellboreUniforms,
  );
}

export class WellboreShader {
  /** Build wellbore shader with assigned variables. */
  static build(maxScale: number, wellboreDash: number) {
    WellboreShader.vertexShader = `
      attribute vec2 verts;
      attribute vec4 vertCol;
      attribute float typeData;
      attribute float logData;

      uniform mat3 translationMatrix;
      uniform mat3 projectionMatrix;
      uniform float wellboreRadius;

      varying vec4 vCol;
      varying float type;
      varying float logvalue;

      void main() {
        vCol = vertCol;
        type = typeData;
        logvalue = logData;

        vec2 normal = vertCol.zw;

        float extraRadius = wellboreRadius - ${toShader(maxScale)};

        gl_Position = vec4((projectionMatrix * translationMatrix * vec3(verts + normal * extraRadius, 1.0)).xy, 0.0, 1.0);
      }
    `;

    const dash = toShader(wellboreDash);
    const doubleDash = toShader(wellboreDash * 2);
    const quadrupleDash = toShader(wellboreDash * 4);
    const littleEndian = machineIsLittleEndian();

    const rgbaToFloat = `
      // note: the 0.1s here and there are voodoo related to precision
      float rgbaToFloat(vec4 v, bool littleEndian) {
        if (!littleEndian) {
          v = v.abgr;
        }
        vec4 bits = v * 255.0;
        float sign = mix(-1.0, 1.0, step(bits[3], 128.0));
        float expo = floor(mod(bits[3] + 0.1, 128.0)) * 2.0 +
              floor((bits[2] + 0.1) / 128.0) - 127.0;
        float sig = bits[0] +
              bits[1] * 256.0 +
              floor(mod(bits[2] + 0.1, 128.0)) * 256.0 * 256.0;
        return sign * (1.0 + sig / 8388607.0) * pow(2.0, expo);
      }
    `
    const isCloseEnough = `
      #ifndef RELATIVE_TOLERANCE
      #define RELATIVE_TOLERANCE 0.0001
      #endif

      bool isCloseEnough(float a, float b) {
        return abs(a - b) <= max(abs(a), abs(b)) * RELATIVE_TOLERANCE;
      }
    `

    const getTexelValue = `
      float getTexelValue(sampler2D texture, vec2 pos, bool littleEndian) {
        vec4 texelRgba = texture2D(texture, pos);
        float texelFloat = rgbaToFloat(texelRgba, littleEndian);
        return texelFloat;
      }
    `

    const computeColor = `
      #ifndef DEFAULT_COLOR
      #define DEFAULT_COLOR vec4(0.0)
      #endif

      #ifndef SENTINEL_MAX_LENGTH
      #define SENTINEL_MAX_LENGTH 150
      #endif

      vec4 computeColor(
        float inputVal,
        sampler2D sentinelColormap,
        int sentinelLength,
        bool littleEndian
      ) {

        // vertical texture coordinate to find color and offset
        float colorRow = 0.25;
        float offsetRow = 0.75;

        // Compare the value against any sentinel values, if defined.
        if (sentinelLength > 0) {
          for (int i = 0; i < SENTINEL_MAX_LENGTH; ++i) {
            if (i == sentinelLength) {
              break;
            }

            float i_f = float(i);
            float sentinelLengthFloat = float(sentinelLength);
            // retrieve the offset from the colormap
            float sentinelOffset = getTexelValue(sentinelColormap, vec2((i_f + 0.5) / sentinelLengthFloat, offsetRow), littleEndian);
            if (isCloseEnough(inputVal, sentinelOffset)) {
            // if (inputVal == sentinelOffset) {
              // retrieve the color from the colormap
              vec2 colormapCoord = vec2((i_f + 0.5) / sentinelLengthFloat, colorRow);
              return texture2D(sentinelColormap, colormapCoord);
            }
          }
        }

        return DEFAULT_COLOR;
      }
    `

    WellboreShader.fragmentShader = `
      precision mediump float;

      ${rgbaToFloat}
      ${isCloseEnough}
      ${getTexelValue}
      ${computeColor}

      varying vec4 vCol;
      varying float type;
      varying float logvalue;

      uniform vec3 wellboreColor1;
      uniform vec3 wellboreColor2;
      uniform bool completionVisible;
      uniform bool colorByLog;
      uniform bool hidePathWithoutInterval;
      uniform bool wellboreVisible;
      uniform bool forceColor;
      uniform bool shadeWellbore;
      uniform int status;
      uniform int sentinelLength;
      uniform sampler2D sentinelColormap;

      const vec3 sunDir = vec3(0.6247, -0.6247, 0.4685);

      void main() {
        vec3 col = vec3(0.0);
        float alpha = 1.0;
        bool littleEndian = ${littleEndian};

        if (status == 0) {
          if (type == 0.0 || type == 3.0 || type == 4.0) {
            if (!wellboreVisible) {
              alpha = 0.03;
            }
          } else if (type == 1.0) {
            col = vec3(1.0, 0.0, 0.0);
          }
          if (!completionVisible && type == 2.0) discard; // hides packers

          float dist = clamp(vCol.z * vCol.z + vCol.w * vCol.w, 0.0, 1.0);
          vec3 dir3D = vec3(vCol.zw, sqrt(1.0 - dist * dist));
          float light = 0.4 + dot(dir3D, sunDir) * 0.6;
          light = clamp(light, 0.0, 1.0);

          if (colorByLog && isCloseEnough(logvalue, -999999.0)) {
            alpha = 0.0;
          }

          if (colorByLog && logvalue > -999.0) {
            vec4 logColor = computeColor(
              logvalue,
              sentinelColormap,
              sentinelLength,
              littleEndian
            );

            if (shadeWellbore) {
              vec3 col1 = vec3(logColor.r, logColor.g, logColor.b);
              vec3 col2 = vec3(logColor.r / 2.0, logColor.g / 2.0, logColor.b / 2.0);
              col = mix(col2, col1, light);
            } else {
              col = vec3(logColor.r, logColor.g, logColor.b);
            }
          } else {
            if (shadeWellbore) {
              col = mix(wellboreColor2, wellboreColor1, light);
            } else {
              col = wellboreColor1;
            }
          }

          if (type == 2.0) {
            if (shadeWellbore) {
              vec3 col1 = vec3(0.3, 0.3, 0.3);
              vec3 col2 = vec3(0.1, 0.1, 0.1);
              col = mix(col2, col1, light);
            } else {
              col = vec3(0.1, 0.1, 0.1);
            }
          }

          if (type == 0.0 && hidePathWithoutInterval) {
            alpha = 0.0;
          }

          if (type == 0.0 && colorByLog && !hidePathWithoutInterval) {
            alpha = 0.5;
          }

          if (forceColor) {
            if (shadeWellbore) {
              col = mix(wellboreColor2, wellboreColor1, light);
            } else {
              col = wellboreColor1;
            }
          }
        }

        else if (status == 1) {
          if (type == 2.0) discard;
          // if(mod(vCol.x + vCol.y * 0.2, ${quadrupleDash}) > ${doubleDash}) discard;
          vec3 c = wellboreColor2 + wellboreColor1 * 0.5;
          vec3 gray = vec3(0.9);
          col = mix(gray, c, 0.3);
        }

        else if (status == 2) {
          if (type == 2.0) discard;
          alpha = 0.03;
        }

        else discard;

        col *= alpha;

        gl_FragColor = vec4(col, alpha);
      }
    `;
  }

  /** Vertex shader */
  public static vertexShader: string = "";

  /** Fragment shader */
  static fragmentShader: string = "";
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// CIRCLE SHADER / ROOT SHADER

export interface RootUniforms {
  active: boolean;
  circleColor1: [number, number, number]; // [R, G, B]
  circleColor2: [number, number, number]; // [R, G, B]
}

export class RootShader {
  /** Get root shader */
  static get() {
    return PIXI.Shader.from(
      RootShader.vertexShader,
      RootShader.fragmentShader,
      {
        active: true,
        circleColor1: [0, 0, 0],
        circleColor2: [0, 0, 0],
      },
    );
  }

  /** Build vertex shader from given resize configs */
  static build(maxScale: number) {
    RootShader.vertexShader = `
      attribute vec2 verts;
      attribute vec2 inputUVs;

      uniform mat3 translationMatrix;
      uniform mat3 projectionMatrix;
      uniform float rootRadius;

      varying vec2 UVs;

      void main() {
        UVs = inputUVs;

        vec2 dir = 2.0 * inputUVs - 1.0;

        float extraRadius = rootRadius - ${toShader(maxScale)};

        gl_Position = vec4((projectionMatrix * translationMatrix * vec3(verts + dir * extraRadius, 1.0)).xy, 0.0, 1.0);
      }
    `;
  }

  public static vertexShader: string = "";

  public static fragmentShader: string = `
    precision mediump float;

    varying vec2 UVs;

    uniform vec3 circleColor1;
    uniform vec3 circleColor2;
    uniform bool active;

    const vec3 sunDir = vec3(0.6247, -0.6247, 0.4685);

    void main() {
      if (!active) {
        discard;
        return;
      }
      vec2 dir = 2.0 * UVs - 1.0;
      float dist = dir.x * dir.x + dir.y * dir.y;
      if (dist > 1.0) discard;

      vec3 dir3D = vec3(dir, sqrt(1.0 - dist * dist));

      float light = dot(dir3D, sunDir);
      light = 0.4 + light * 0.6;

      vec3 col = mix(circleColor2, circleColor1, clamp(light, 0.0, 1.0));

      gl_FragColor = vec4(col, 1.0);
    }
  `;
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
