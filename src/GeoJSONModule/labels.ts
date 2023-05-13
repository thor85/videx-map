import * as PIXI from 'pixi.js';
import {v4 as uuidv4} from 'uuid';
import Vector2 from '@equinor/videx-vector2';

/** Data for label. */
export type GeoJSONLabelData = {
  position: Vector2;
  mass: number;
}

interface Label {
  name: string;
  position: Vector2;
  instance?: PIXI.BitmapText;
  labelLoc?: any;
}

/** Class used to manage field labels. Handles scaling and grouping of labels. */
export default class GeoJSONLabels {

  /**PIXI container  to hold all labels*/
  container: PIXI.Container;

  /** The textstyle used for labels. */
  textStyle: PIXI.TextStyle;

  /** The font used for labels. */
  font: PIXI.BitmapFont;

  /** font name */
  fontName: string;

  /** Scale of labels when size is set to 1. */
  baseScale: number;

  module: any;

  /** Collection of single-polygon fields. */
  labels: Label[] = [];

  /** Visibility */
  visible: boolean = true;

  /** construct a new label container. */
  constructor(root: PIXI.Container, textStyle: PIXI.TextStyle, baseScale: number, module: any, fontName?: string) {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    root.addChild(this.container);

    // textStyle.fontSize = textStyle.fontSize * 2;
    this.textStyle = textStyle;
    // console.log(textStyle)

    this.module = module;

    this.baseScale = baseScale;
    this.fontName = fontName || uuidv4();
    const charSet = PIXI.BitmapFont.ALPHANUMERIC.concat(['æ', 'ø', 'å', 'Æ', 'Ø', 'Å']).concat(['-', '\\', '/', '_', '?', '+', '%', '&', ':']);
    // const charSet = PIXI.BitmapFont.ASCII.concat(['æ', 'ø', 'å', 'Æ', 'Ø', 'Å']);
    if (!this.font) this.font = PIXI.BitmapFont.from(this.fontName, this.textStyle, {resolution: window.devicePixelRatio, chars: charSet, textureHeight: 512, textureWidth: 512});
  }

  /**
   * Add a new label.
   * @param name label name
   * @param data Data for each label
   */
  addLabel(name: string, data: GeoJSONLabelData) { // Single-polygon
      this.labels.push({
        name,
        position: data.position,
        instance: null,
      });
  }

  /**
   * Draw all labels
   * @param root Target root for labels
   */
  draw(scale=this.baseScale) {
    // Function for drawing single label
    const drawLabel = (name: string, position: Vector2, labelLoc: any = {}) => {
      const instance: PIXI.BitmapText = new PIXI.BitmapText(name, {fontName: this.fontName});

      let positionX = position[0];
      let positionY = position[1];

      if (labelLoc.hasOwnProperty('lng') || labelLoc.hasOwnProperty('lat')) {
        // const zoom = this.module.pixiOverlay._map.getZoom();
        const labelLatLng = this.module.pixiOverlay.utils.layerPointToLatLng([position[0], position[1]])

        if (labelLoc.hasOwnProperty('lng')) {labelLatLng.lng = labelLatLng.lng + labelLoc.lng;}
        if (labelLoc.hasOwnProperty('lat')) {labelLatLng.lat = labelLatLng.lat + labelLoc.lat;}
        const layerPoint = this.module.pixiOverlay.utils.latLngToLayerPoint(labelLatLng)

        positionX = layerPoint['x'];
        positionY = layerPoint['y'];
      }

      let labelAngle = 0;
      if (labelLoc.hasOwnProperty('angle')) {
        labelAngle = labelLoc.angle;
      };

      instance.position.set(positionX, positionY);
      instance.scale.set(scale * 0.5);
      instance.angle = labelAngle;
      // instance.scale.set(this.baseScale);
      // instance.anchor = new PIXI.Point(0.5, 0.5);
      instance.anchor.set(0.5, 0.5);
      instance.zIndex = 1000; // High z-index
      this.container.addChild(instance);
      return instance;
    };

    // Draw single-polygon labels
    this.labels.forEach(label => {
      label.instance = drawLabel(label.name, label.position, label.labelLoc);
    });
  }


  hideLabels() {
    this.container.visible = false
    this.visible = false;
  }

  showLabels() {
    this.container.visible = true
    this.visible = true;
  }

  resize(scale: number) {
    this.labels.forEach((lbl) => lbl.instance.scale.set(scale * 0.5));
  }
}
