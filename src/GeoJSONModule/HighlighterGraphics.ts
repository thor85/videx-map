import * as PIXI from 'pixi.js';
import { FeatureProps } from '.';
import { drawPoint } from './point'
//@ts-ignore
window.PIXI = PIXI; //workaround for filters
import { OutlineFilter } from '@pixi/filter-outline';


export interface FeatureGraphics {
  // @ts-ignore
    graphics: PIXI.Graphics | PIXI.Sprite | any;
    properties: FeatureProps;
    projected?: any;
}

interface Cache {
  index: number;
  properties: FeatureProps;
  baseZIndex: number;
  graphic: FeatureGraphics;
  projected?: any;
}

/**
 * Highlighter class for geoJSON polygon.
 */
export default class Highlighter {
  graphics: FeatureGraphics[] = [];

  // Cached data from highlight
  cached: Cache = undefined;

  // Highlight colors
  highlightColor: number;

  zoom: number = null;

  constructor(highlightColor: number) {
    this.highlightColor = highlightColor;
  }

  /**
   * Add a new group to highlighter.
   * @param group Group of field meshes
   */
  add(graphic: FeatureGraphics): void {
    this.graphics.push(graphic);
  }

  /**
   * Highlight a group by given index.
   * @param index Index of group to highlight
   */
  highlight(index: number): void {
    const target = this.graphics[index];
    const graphic = target.graphics;
    const properties = target.properties;
    const projected = target.projected;

    if (this.cached) {this.revert()};

    // Cache colors before highlight
    this.cached = {
      index: index,
      properties: target.properties,
      baseZIndex: graphic.zIndex,
      projected: projected,
      graphic: graphic,
    }

      // Highlight
    if (properties.style.pointShape === 'image') {
      const thickness = properties.style.lineWidth * Math.pow(2, this.zoom)
      const outlineFilter = new OutlineFilter(thickness, 0x00FFFF, 1);
      graphic.filters = [outlineFilter];
    } else {
      graphic.clear();
      drawPoint(graphic, properties, projected, this.highlightColor);
    }
    // graphic.zIndex += 10000;
  }

  /** Revert any highlighting. */
  revert(): boolean {
    if (!this.cached) return false;
    // Revert selection
    const properties = this.cached.properties;
    const graphic = this.cached.graphic;
    const projected = this.cached.projected;
    if (properties.style.pointShape === 'image') {
      //@ts-ignore
      graphic.filters = null;
    } else {
      //@ts-ignore
      graphic.clear();
      drawPoint(graphic, properties, projected);
    }
    this.cached = undefined;
    return true;
  }
}
