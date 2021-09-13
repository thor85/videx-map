import * as PIXI from 'pixi.js';
import { color } from 'd3';
import Vector2 from '@equinor/videx-vector2';

import { pixiOverlayBase } from '../pixiOverlayInterfaces';
import PointDictionary from '../utils/PointDictionary';
import { FeatureProps } from '.';

// import { Conic, ConicDisplay } from '@pixi-essentials/conic';


/** Interface for faultline config. */
interface InputConfig {
  /** Color of faultline on format 0xRRGGBB. (Default: 0x727D88) */
  color?: number;
  /** Alpha of faultlines. (Default: 1.0) */
  alpha?: number;
  /** Width of outline. (Default: 0.125) */
  outlineWidth?: number;
}

interface Config {
  /** Color of faultline on format 0xRRGGBB. (Default: 0x727D88) */
  color: number;
  /** Alpha of faultlines. (Default: 1.0) */
  alpha: number;
  /** Width of outline. (Default: 0.125) */
  outlineWidth: number;
}

/** Module for displaying fields. */
export default class GeoJSONPoint {

  /** Graphic elements currently existing in world space. */
  spawned: PIXI.Graphics[] = [];

  /** Pool of initialized graphic elements. */
  pool: PIXI.Graphics[] = [];

  container: PIXI.Container;
  pixiOverlay: pixiOverlayBase;
  dict: PointDictionary<any>;

  textStyle: PIXI.TextStyle;

  constructor(root: PIXI.Container, pixiOverlay: pixiOverlayBase) {
    this.dict = new PointDictionary<number>(0.25, 20, 4);
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    root.addChild(this.container);

    this.pixiOverlay = pixiOverlay;
  }

  add(feature: GeoJSON.Feature, props: (feature: object) => FeatureProps) {

    const geom = feature.geometry as GeoJSON.Point;
    const properties: FeatureProps = props(feature);

    const coordinates = geom.coordinates as [number, number];
    if(coordinates?.length > 0) {
      const projected = this.projectPoint(coordinates);

      this.dict.add(projected, feature.properties);
      let point;
      if (this.pool.length > 0) {
        point = this.pool.pop();
      } else {
        point = new PIXI.Graphics();
        this.container.addChild(point);
      }
      const fillColor = properties.style.fillColor ? PIXI.utils.string2hex(color(properties.style.fillColor).hex()) : 0x0;
      const lineColor = properties.style.lineColor ? PIXI.utils.string2hex(color(properties.style.lineColor).hex()) : 0x0;
      const opacity = properties.style.fillOpacity || 0;
      const offset = properties.style.pointSize || 4;
      const pointShape = properties.style.pointShape || 'square';
      point.lineStyle(properties.style.lineWidth, lineColor);
      point.beginFill(fillColor, opacity);
      if (pointShape == 'square') {
        point.drawRect(projected[0] - offset, projected[1] - offset, offset*2, offset*2);
      } else if (pointShape == 'circle') {
        // Need to draw circle large and scale down to avoid jagged edges when zooming in
        const scale = 10;
        point.drawCircle(projected[0] * scale, projected[1] * scale, offset * scale);
        point.scale.set(1 / scale, 1 / scale);
      }

      point.zIndex = 99999;

      point.endFill();

      this.spawned.push(point);
    }
  }

 /**
   * Project a point coordinate.
   * @param point x,y pair
   * @returns Projected point
   */
  projectPoint(point: [number, number]): Vector2 {
    const project = this.pixiOverlay.utils.latLngToLayerPoint;
    const coord = project([point[1], point[0]]);
    return new Vector2(coord.x, coord.y);
  }

  resize(zoom: number) {

  }

  testPosition(pos: Vector2, radiusThreshold: number = 0.5) : any {
    return this.dict.getClosestUnder(pos, radiusThreshold);
  }
}
