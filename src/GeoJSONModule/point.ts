import * as PIXI from 'pixi.js';
import '@pixi/graphics-extras';
import { color } from 'd3';
import Vector2 from '@equinor/videx-vector2';

import { pixiOverlayBase } from '../pixiOverlayInterfaces';
import PointDictionary from '../utils/PointDictionary';
import { FeatureProps } from '.';
import Highlighter from './HighlighterGraphics';

export function drawPoint(point, properties, projected, forcedLineColor = null) {
  const fillColor = properties.style.fillColor ? PIXI.utils.string2hex(color(properties.style.fillColor).hex()) : 0x0;
  let lineColor = properties.style.lineColor ? PIXI.utils.string2hex(color(properties.style.lineColor).hex()) : 0x0;
  if (forcedLineColor) lineColor = forcedLineColor;
  const opacity = properties.style.fillOpacity || 0;
  const offset = properties.style.pointSize || 4;
  const pointFillet = properties.style?.pointOptions?.pointFillet || 1;
  const pointShape = properties.style.pointShape || 'square';
  const pointRectangularSides = properties.style?.pointOptions?.pointRectangularSides || 3;
  const pointRotation = properties.style?.pointOptions?.pointRotation || 0;
  point.lineStyle(properties.style.lineWidth, lineColor);
  point.beginFill(fillColor, opacity);
  if (pointShape == 'square') {
    point.drawRect(projected[0] - offset, projected[1] - offset, offset*2, offset*2);
  } else if (pointShape == 'circle') {
    // Need to draw circle large and scale down to avoid jagged edges when zooming in
    const scale = 10;
    point.drawCircle(projected[0] * scale, projected[1] * scale, offset * scale);
    point.scale.set(1 / scale, 1 / scale);
  } else if (pointShape == 'filletrect') {
    // Need to draw circle large and scale down to avoid jagged edges when zooming in
    const scale = 10;
    point.drawFilletRect((projected[0] - offset*0.5) * scale, (projected[1] - offset*0.5) * scale, offset * scale, offset * scale, pointFillet);
    // point.drawFilletRect((projected[0]) * scale, (projected[1]) * scale, offset * scale, offset * scale, pointFillet);
    point.scale.set(1 / scale, 1 / scale);
  } else if (pointShape == 'regularpolygon') {
    // Need to draw circle large and scale down to avoid jagged edges when zooming in
    // const scale = 1;
    // point.drawRegularPolygon(projected[0] - offset, projected[1] - offset, offset, pointRectangularSides, pointRotation);
    point.drawRegularPolygon(projected[0], projected[1], offset, pointRectangularSides, pointRotation);
    // point.drawRegularPolygon((projected[0] - offset) * scale, (projected[1] - offset) * scale, offset * scale, offset * scale, pointFillet);
    // point.scale.set(1 / scale, 1 / scale);
  }

  point.zIndex = 99999;

  point.endFill();

  return;
}

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
  spawned: (PIXI.Graphics|PIXI.Sprite)[] = [];

  /** Pool of initialized graphic elements. */
  pool: (PIXI.Graphics|PIXI.Sprite)[] = [];

  container: PIXI.Container;
  pixiOverlay: pixiOverlayBase;
  dict: PointDictionary<any>;

  textStyle: PIXI.TextStyle;

  highlighter: Highlighter;

  /** Index of previously highlighted point */
  prevHighlighted: number = -1;

  pointId: number = 0;

  constructor(root: PIXI.Container, pixiOverlay: pixiOverlayBase) {
    this.dict = new PointDictionary<number>(100, 500, 4);
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    root.addChild(this.container);

    this.highlighter = new Highlighter(0x00FFFF);

    this.pixiOverlay = pixiOverlay;
  }

  add(feature: GeoJSON.Feature, props: (feature: object) => FeatureProps) {

    const geom = feature.geometry as GeoJSON.Point;
    const properties: FeatureProps = props(feature);

    const coordinates = geom.coordinates as [number, number];
    if(coordinates?.length > 0) {
      const projected = this.projectPoint(coordinates);
      this.dict.add(projected, {
        id: this.pointId,
        properties: feature.properties,
        projected: projected,
        props: properties,
      });
      this.pointId++;
      let point;
      if (properties.style.pointShape === 'image') {
        const pointImage = properties.style?.pointOptions?.pointImage || '';
        point = PIXI.Sprite.from(pointImage);
        point.anchor.x = 0.5;
        point.anchor.y = 0.5;
        point.position.x = projected[0];
        point.position.y = projected[1];

        const pointScale = properties.style?.pointOptions?.pointScale || 0.1;
        point.scale.x = pointScale;
        point.scale.y = pointScale;

        this.container.addChild(point);
        this.spawned.push(point);
      } else {
        if (this.pool.length > 0) {
          point = this.pool.pop();
        } else {
          point = new PIXI.Graphics();
          this.container.addChild(point);
        }
        drawPoint(point, properties, projected);

        this.spawned.push(point);
      }
      this.highlighter.add({
        graphics: point,
        properties: properties,
        projected: projected,
      });
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
    this.highlighter.zoom = zoom;
    if (this.highlighter.cached) {this.highlighter.highlight(this.highlighter.cached.index)}
  }

  testPosition(pos: Vector2, radiusThreshold: number = 0.5) : any {
    const hitPoint = this.dict.getClosestUnder(pos, radiusThreshold);
    if (hitPoint) {
      // Don't highlight field twice
      if (this.prevHighlighted !== hitPoint.val.id) {
        this.highlighter.highlight(hitPoint.val.id);
        this.prevHighlighted = hitPoint.val.id;
        this.pixiOverlay.redraw();
      }
      // make returned object same as before
      const newObject = {};
      newObject['val'] = {...hitPoint.val.properties}
      return newObject
    } else {
      if (this.highlighter.revert()) {this.pixiOverlay.redraw();}
      this.prevHighlighted = -1;
      return hitPoint;
    }
  }
}
