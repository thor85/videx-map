import * as PIXI from 'pixi.js';

type vec3 = [number, number, number];

export interface Color {
  col1: vec3;
  col2: vec3;
  labelBg: number;
}

export interface ColorOffset {
  color: string;
  offset: number;
  label?: string;
}

export interface Colors {
  fontColor: number;
  interactFontColor: number;
  default: Color;
  highlight: Color;
  multiHighlight: Color;
  selected: Color;
}

/** Enum for selecting color. [ Default, Highlight, MultiHighlight, Selected ] */
export enum ColorType {
  Default,
  Highlight,
  MultiHighlight,
  Selected,
}

export interface InputColors {
  fontColor?: number;
  interactFontColor?: number;
  defaultColor1?: vec3;
  defaultColor2?: vec3;
  defaultLabelBg?: number;
  highlightColor1?: vec3;
  highlightColor2?: vec3;
  highlightLabelBg?: number;
  multiHighlightColor1?: vec3;
  multiHighlightColor2?: vec3;
  multiHighlightLabelBg?: number;
  selectedColor1?: vec3;
  selectedColor2?: vec3;
  selectedLabelBg?: number;
}


export const RGB_REGEX = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
export const HEX_REGEX = /(?:#)[0-9a-f]{8}|(?:#)[0-9a-f]{6}|(?:#)[0-9a-f]{4}|(?:#)[0-9a-f]{3}/ig;

/**
 * hexToRGB converts a color from hex format to rgba.
 * const [r, g, b, a] = hexToRGB("#ffeeaaff")
 */
 export const hexToRGB = (hex: string) => {
  const hasAlpha = hex.length === 9;
  const start = hasAlpha ? 24 : 16;
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> start) & 255;
  const g = (bigint >> (start - 8)) & 255;
  const b = (bigint >> (start - 16)) & 255;
  const a = hasAlpha ? (bigint >> (start - 24)) & 255 : 255;
  return [r, g, b, a];
};

/**
 * Parses a color string of the form 'rgb({rVal}, {gVal}, {bVal})' and converts the resulting values
 * to an array with ints 0 - 255.
 */
 export function colorStringToInts(colorstring: string): number[] {
  if (colorstring === 'transparent') {
    return [0, 0, 0, 0];
  }
  const rgbmatch = colorstring.match(RGB_REGEX);
  const hexmatch = colorstring.match(HEX_REGEX);
  if (rgbmatch !== null) {
    const [, r, g, b] = rgbmatch;
    return [+r, +g, +b, 255];
  } else if (hexmatch !== null) {
    return hexToRGB(colorstring);
  } else {
    throw new Error(`'${colorstring}' is not a valid RGB or hex color expression.`);
  }
}

/**
 * colormapToFlatArray takes the input colormap and returns a flat array to be
 * used as input to a texture. The first row in the array contains the colors.
 * The second row contains the encoded offset values.
 */
 export const colormapToFlatArray = (colormap: ColorOffset[]) => {
  const offsets: number[] = [];
  let colors: number[] = [];
  for (let i = 0; i < colormap.length; i++) {
    offsets.push(colormap[i].offset);
    const colorsnew = colorStringToInts(colormap[i].color);
    colors = colors.concat(colorsnew);
  }
  // console.log(colors)

  const floatOffsets = new Float32Array(offsets);
  // console.log(floatOffsets)
  const uintOffsets = new Uint8Array(floatOffsets.buffer);
  const normalOffsets = Array.from(uintOffsets);
  const colormapArray: number[] = colors.concat(normalOffsets);

  return colormapArray;
};

/**
 * Creates a texture with colors on first row and offsets on second row
 */
 export function createColormapTexture(colormapInput: ColorOffset[] ) {
  const colormapFlatArray = colormapToFlatArray(colormapInput);
  // console.log(colormapFlatArray)
  const colormapUint8 = Uint8Array.from(colormapFlatArray);
  const colormapTexture = PIXI.BaseTexture.fromBuffer(
    colormapUint8,
    colormapInput.length,
    2,
  )

  return colormapTexture;
}

/** Get default configuration for wellbores. */
export function getDefaultColors(input?: InputColors): Colors {

  const output: Colors = {
    fontColor: 0x000000,
    interactFontColor: 0x01747d,
    default: {
      col1: [0.3, 0.3, 0.3],
      col2: [0.05, 0.05, 0.05],
      labelBg: 0xFFFFFF,
    },
    highlight: {
      // col1: [0.8, 0.2, 0.9],
      col1: [0, 1.0, 1.0],
      col2: [0, 0.7, 0.7],
      labelBg: 0x00FFFF,
    },
    multiHighlight: {
      col1: [0, 1.0, 1.0],
      col2: [0, 0.7, 0.7],
      labelBg: 0x00FFFF,
      // col1: [0.55, 0.55, 0.55],
      // col2: [0.3, 0.3, 0.3],
      // labelBg: 0x666666,
    },
    selected: {
      col1: [1.0, 0.0, 0.0],
      col2: [0.5, 0.0, 0.0],
      labelBg: 0xFFFFFF,
    },
  };

  // Return early if no input
  if (!input) return output;

  // Try to transfer from input
  function transfer(key: string) {
    // @ts-ignore
    if (!isNaN(input[key])) output[key] = input[key];
  }

  // Try to transfer color data
  function transferColor(color: string) {
    // @ts-ignore
    const inputCol1: vec3 = input[`${color}Color1`];
    // @ts-ignore
    const inputCol2: vec3 = input[`${color}Color2`];
    // @ts-ignore
    const inputLabelBg: number = input[`${color}LabelBg`];

    // @ts-ignore
    const outputColor: Color = output[color];
    if (inputCol1) outputColor.col1 = inputCol1;
    if (inputCol2) outputColor.col2 = inputCol2;
    if (inputLabelBg) outputColor.labelBg = inputLabelBg;
  }

  transfer('fontColor');
  transfer('interactFontColor');
  transferColor('default');
  transferColor('highlight');
  transferColor('multiHighlight');
  transferColor('selected');

  return output;
}

