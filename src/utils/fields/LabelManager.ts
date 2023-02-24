import * as PIXI from 'pixi.js';
import Vector2 from '@equinor/videx-vector2';
import {v4 as uuidv4} from 'uuid';
import groupLabels from './groupLabels';

/** Data for label. */
export type LabelData = {
  position: Vector2;
  mass: number;
}

/** Field with connected labels. */
interface Field {
  name: string;
  position: Vector2;
  instance?: PIXI.BitmapText;
}

/** Instance of a multi-label entry. */
export type Label = {
  position: Vector2;
  mass: number;
  instance: PIXI.BitmapText;
  active: boolean;
}

export interface MultiField {
  name: string;
  labels: Label[];
  width: number;
  height: number;
}

/** Class used to manage field labels. Handles scaling and grouping of labels. */
export default class LabelManager {

  /** The textstyle used for labels. */
  textStyle: PIXI.TextStyle;

  /** Scale of labels when size is set to 1. */
  baseScale: number;

  /** Collection of single-polygon fields. */
  fields: Field[] = [];

  /** Collectionh of multi-polygon fields. Labels are grouped when scaling. */
  multiFields: MultiField[] = [];

  /** Value of previous scale */
  prevScale: number = 1;

  /** Visibility of labels */
  visible: boolean = true;

  /** The font used for labels. */
  font: PIXI.BitmapFont;

  /** font name */
  fontName: string;

  /** construct a new label manager. */
  constructor(textStyle: PIXI.TextStyle, baseScale: number, fontName?: string) {
    this.textStyle = textStyle;
    this.baseScale = baseScale;

    this.fontName = fontName || uuidv4();
    const charSet = PIXI.BitmapFont.ASCII.concat(['æ', 'ø', 'å', 'Æ', 'Ø', 'Å']);
    this.font = PIXI.BitmapFont.from(this.fontName, this.textStyle, {resolution: window.devicePixelRatio, chars: charSet, textureHeight: 4096, textureWidth: 4096});
  }

  /**
   * Add a new field to manage.
   * @param name Name of field
   * @param entries Data for each label
   */
  addField(name: string, entries: LabelData[]) {
    if (typeof name === 'undefined') name = '';
    if (entries.length <= 1) { // Single-polygon
      this.fields.push({
        name,
        position: entries[0].position,
        instance: null,
      });
    } else { // Multi-polygon
      const textMetrics: PIXI.TextMetrics = PIXI.TextMetrics.measureText(name, this.textStyle);
      const width: number = textMetrics.width * this.baseScale; // Multiply by scale
      const height: number = textMetrics.height * this.baseScale; // Multiply by scale

      const labels: Label[] = entries.map(entry => {
        return {
          position: entry.position,
          mass: entry.mass,
          instance: null,
          active: true,
          consumed: [],
          consumer: -1,
        }
      });

      this.multiFields.push({ name, labels, width, height });
    }
  }

  /**
   * Draw all labels assigned to manager.
   * @param root Target root for labels
   */
  draw(root: PIXI.Container) {
    // Function for drawing single label
    const drawLabel = (name: string, position: Vector2) => {
      const instance: PIXI.BitmapText = new PIXI.BitmapText(name, {fontName: this.fontName});
      // const instance: PIXI.Text = new PIXI.Text(name, this.textStyle);
      // instance.resolution = 2; // Increases text resolution
      instance.position.set(position[0], position[1]);
      instance.scale.set(this.baseScale * 0.5);
      instance.anchor = new PIXI.Point(0.5, 0.5);
      // instance.anchor.set(0.5);
      instance.zIndex = 100000; // High z-index
      root.addChild(instance);
      return instance;
    }

    // Draw single-polygon labels
    this.fields.forEach(field => {
      field.instance = drawLabel(field.name, field.position);
    });

    // Draw multi-polygon labels
    this.multiFields.forEach(field => {
      field.labels.forEach(label => {
        label.instance = drawLabel(field.name, label.position);
      });
    });
  }

  /**
   * Resize all labels.
   * @param scale New scale for labels
   */
  resize(scale: number) {
    this.fields.forEach(field => {
      field.instance.scale.set(scale * this.baseScale);
    });

    this.multiFields.forEach(field => {
      field.labels.forEach(label => {
        label.instance.scale.set(scale * this.baseScale * 0.5);
      });

      const centers = groupLabels(field, scale);

      // Enable visible
      for (let i = 0; i < centers.length; i++) {
        const label = field.labels[i];
        const pos = centers[i];
        label.instance.visible = true;
        label.instance.position.set(pos[0], pos[1]);
      }

      // Disable unused
      for (let i = centers.length; i < field.labels.length; i++) {
        const label = field.labels[i];
        label.instance.visible = false;
      }
    });

    this.prevScale = scale;
  }

  hideLabels() {
    this.fields.forEach(field => {
      field.instance.visible = false;
    });

    this.multiFields.forEach(field => {
      field.labels.forEach(label => {
        label.instance.visible = false;
      });
    });

    this.visible = false;
  }

  showLabels() {
    this.fields.forEach(field => {
      field.instance.visible = true;
    });

    this.visible = true;
  }
}
