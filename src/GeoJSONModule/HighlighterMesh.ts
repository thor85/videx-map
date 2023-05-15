import * as PIXI from 'pixi.js';

import { FillUniform, OutlineUniform } from './polygon'


export interface FeatureMesh {
  fill?: {
    mesh: PIXI.Mesh;
    uniform: FillUniform;
  };
  outline: {
    mesh: PIXI.Mesh;
    uniform: OutlineUniform;
  };
}

type vec3 = [number, number, number];

interface Cache {
  outlineCol: vec3;
  fillCol1?: vec3;
  fillCol2?: vec3;
  opacity?: number;
  baseZIndex: number;
  polygon: FeatureMesh;
}

/**
 * Highlighter class for geoJSON polygon.
 */
export default class Highlighter {
  meshes: FeatureMesh[][] = [];

  // Cached data from highlight
  cached: Cache[] = undefined;

  // Highlight colors
  outlineColor: vec3;
  fillColor: any;
  opacity: any;

  constructor(outlineColor: vec3, fillColor: any = false, opacity: any = false) {
    this.outlineColor = outlineColor;
    this.fillColor = fillColor;
    this.opacity = opacity;
  }

  /**
   * Add a new group to highlighter.
   * @param group Group of field meshes
   */
  add(group: FeatureMesh[]): void {
    this.meshes.push(group);
    // console.log(this.meshes)
  }

  /**
   * Highlight a group by given index.
   * @param index Index of group to highlight
   */
  highlight(index: number): void {
    const target = this.meshes[index];

    if (this.cached) {this.revert()};

    this.cached = new Array(target.length);
    for (let i = 0; i < target.length; i++) {
      const polygon = target[i];

      // Cache colors before highlight
      this.cached[i] = {
        outlineCol: polygon.outline.uniform.color,
        fillCol1: polygon.fill.uniform.col1,
        fillCol2: polygon.fill.uniform.col2,
        opacity: polygon.fill.uniform.opacity,
        baseZIndex: polygon.outline.mesh.zIndex,
        polygon,
      }

      // Highlight
      if (this.fillColor) {
        polygon.fill.uniform.col1 = this.fillColor;
        polygon.fill.uniform.col2 = this.fillColor;
        polygon.fill.mesh.zIndex += 10000;
      }
      if (this.opacity) {
        polygon.fill.uniform.opacity = this.opacity;
      }
      polygon.outline.uniform.color = this.outlineColor;
      polygon.outline.mesh.zIndex += 10000;
    }
  }

  /** Revert any highlighting. */
  revert(): boolean {
    if (!this.cached) return false;
    // Revert selection
    this.cached.forEach(d => {
      // console.log(this.cached)
      // d.polygon.outline.mesh.zIndex = d.baseZIndex;
      d.polygon.outline.uniform.color = d.outlineCol;
      d.polygon.fill.uniform.col1 = d.fillCol1;
      d.polygon.fill.uniform.col2 = d.fillCol2;
      d.polygon.fill.uniform.opacity = d.opacity;
      d.polygon.outline.mesh.zIndex = d.baseZIndex;
      // d.polygon.outline.mesh.zIndex = d.baseZIndex + 1;
    });
    this.cached = undefined;
    return true;
  }
}
