/* eslint-disable no-magic-numbers, curly */
import * as PIXI from 'pixi.js';
// import { color } from 'd3';
import { color } from 'd3-color';
import Vector2 from '@equinor/videx-vector2';
// import {DropShadowFilter} from '@pixi/filter-drop-shadow';

import { pixiOverlayBase } from '../pixiOverlayInterfaces';
import PointDictionary from '../utils/PointDictionary';
import { FeatureProps } from '.';
import Highlighter from './HighlighterGraphics';


function drawRegularPolygon(
  // @ts-ignore
  this: PIXI.Graphics,
  x: number,
  y: number,
  radius: number,
  sides: number,
  // @ts-ignore
  rotation = 0) : PIXI.Graphics
{
  sides = Math.max(sides | 0, 3);
  const startAngle = (-1 * Math.PI / 2) + rotation;
  const delta = (Math.PI * 2) / sides;
  const polygon = [];

  for (let i = 0; i < sides; i++)
  {
      const angle = (i * delta) + startAngle;

      polygon.push(
          x + (radius * Math.cos(angle)),
          y + (radius * Math.sin(angle))
      );
  }

  return this.drawPolygon(polygon);
}

function drawTorus(
  // @ts-ignore
  this: PIXI.Graphics,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startArc = 0,
  // @ts-ignore
  endArc: number = Math.PI * 2) : PIXI.Graphics
{
  if (Math.abs(endArc - startArc) >= Math.PI * 2)
  {
      return this
          .drawCircle(x, y, outerRadius)
          .beginHole()
          .drawCircle(x, y, innerRadius)
          .endHole();
  }

  this.finishPoly();
  this
      .arc(x, y, innerRadius, endArc, startArc, true)
      .arc(x, y, outerRadius, startArc, endArc, false)
      .finishPoly();

  return this;
}


export function drawPoint(point, properties, projected, forcedLineColor = null) {
  //@ts-ignore
  const fillColor = properties.style.fillColor ? new PIXI.Color(color(properties.style.fillColor).formatHex()).toNumber() : 0x0;
  //@ts-ignore
  let lineColor = properties.style.lineColor ? new PIXI.Color(color(properties.style.lineColor).formatHex()).toNumber()  : 0x0;
  if (forcedLineColor) lineColor = forcedLineColor;
  const opacity = properties.style.fillOpacity || 0;
  const offset = properties.style.pointSize || 4;
  const pointFillet = properties.style?.pointOptions?.pointFillet || 1;
  const pointShape = properties.style.pointShape || 'square';
  const pointRectangularSides = properties.style?.pointOptions?.pointRectangularSides || 3;
  const pointInnerRadius = properties.style?.pointOptions?.pointInnerRadius || 5;
  const pointOuterRadius = properties.style?.pointOptions?.pointOuterRadius || 15;
  const pointStartArc = properties.style?.pointOptions?.pointStartArc || 0;
  const pointEndArc = properties.style?.pointOptions?.pointEndArc || Math.PI * 2;
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
  } else if (pointShape == 'filletrect' || pointShape == 'roundedrect') {
    // Need to draw circle large and scale down to avoid jagged edges when zooming in
    const scale = 10;
    // point.drawFilletRect((projected[0] - offset*0.5) * scale, (projected[1] - offset*0.5) * scale, offset * scale, offset * scale, pointFillet);
    point.drawRoundedRect((projected[0] - offset*0.5) * scale, (projected[1] - offset*0.5) * scale, offset * scale, offset * scale, pointFillet);
    point.scale.set(1 / scale, 1 / scale);
  } else if (pointShape == 'regularpolygon') {
    point.drawRegularPolygon = drawRegularPolygon;
    // Need to draw circle large and scale down to avoid jagged edges when zooming in
    // const scale = 1;
    // point.drawRegularPolygon(projected[0] - offset, projected[1] - offset, offset, pointRectangularSides, pointRotation);
    point.drawRegularPolygon(projected[0], projected[1], offset, pointRectangularSides, pointRotation);
    // point.drawRegularPolygon((projected[0] - offset) * scale, (projected[1] - offset) * scale, offset * scale, offset * scale, pointFillet);
    // point.scale.set(1 / scale, 1 / scale);
  } else if (pointShape == 'torus') {
    point.drawTorus = drawTorus;
    point.drawTorus(projected[0], projected[1], offset, pointInnerRadius, pointOuterRadius, pointStartArc, pointEndArc);
  }

  point.zIndex = 99999;

  point.endFill();

  return;
}

/** Module for displaying points. */
export default class GeoJSONPoint {

  /** Graphic elements currently existing in world space. */
  // @ts-ignore
  spawned: (PIXI.Graphics|PIXI.Sprite)[] = [];

  /** Pool of initialized graphic elements. */
  // @ts-ignore
  pool: (PIXI.Graphics|PIXI.Sprite)[] = [];

  container: PIXI.Container;
  pixiOverlay: pixiOverlayBase;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  dict: PointDictionary<any>;

  textStyle: PIXI.TextStyle;

  highlighter: Highlighter;

  /** Index of previously highlighted point */
  prevHighlighted: number = -1;

  pointId: number = 0;

  constructor(root: PIXI.Container, pixiOverlay: pixiOverlayBase, pointDictionaryOptions: any) {
    this.dict = new PointDictionary<number>(pointDictionaryOptions[0], pointDictionaryOptions[1], pointDictionaryOptions[2]);
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
          // @ts-ignore
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
  // resize(_zoom: number) {

  // setDropShadow(visible: boolean) {
  //   if (visible) {
  //     this.container.filters = [new DropShadowFilter({
  //       distance: 5,
  //     })]
  //   } else {
  //     this.container.filters = null;
  //   }
  // }

  // }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  testPosition(pos: Vector2, radiusThreshold: number = 0.5) : any {
    const hitPoint = this.dict.getClosestUnder(pos, radiusThreshold);
    if (hitPoint) {
      // Don't highlight field twice
      if (this.prevHighlighted !== hitPoint.val.id) {
        this.highlighter.highlight(hitPoint.val.id);
        this.prevHighlighted = hitPoint.val.id;
        // this.setDropShadow(true)
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
