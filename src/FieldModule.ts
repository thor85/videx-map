import * as PIXI from 'pixi.js';
import { ModuleInterface } from './ModuleInterface';
import Mesh, { MeshData, MeshNormalData } from './utils/Mesh';
import centerOfMass from './utils/centerOfMass';
import Highlighter from './utils/fields/Highlighter';
import preprocessFields from './utils/fields/preprocessFields';
import LabelManager, { LabelData } from './utils/fields/LabelManager';
import { EventHandler, DefaultEventHandler } from './EventHandler';
import { clamp } from '@equinor/videx-math';
import TriangleDictionary from './utils/TriangleDictionary';
import Vector2 from '@equinor/videx-vector2';
import Projector from './utils/wellbores/Projector';
import {
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
  FeatureProps,
} from './GeoJSONModule';

function arraysEqual(a1, a2) {
  /* WARNING: arrays must not contain {objects} or behavior may be undefined */
  return JSON.stringify(a1) == JSON.stringify(a2);
}

type vec3 = [number, number, number];

interface FillUniform {
  col1: vec3;
  col2: vec3;
  opacity: number;
  hashed: boolean;
  hashDisp: number;
  hashWidth: number;
}

interface OutlineUniform {
  color: vec3;
  width: number;
}

/** Collection of data describing colors used for fill. */
interface FieldStyle {
  fillColor1: vec3;
  fillColor2: vec3;
  fillOpacity: number;
  outlineColor: vec3;
  hashed: boolean;
}

export interface Field {
  type: string;
  geometry: {
    type: string;
    /**
     * The type of data found within coordinates depends on type.
     * For 'Polygon', coordinates is given as [number, number][][].
     * for 'MultiPolygon', coordinates is given as [number, number][][][].
     */
    coordinates: [number, number][][] | [number, number][][][];
  };
  properties: {
    discname: string;
    group: number;
    guid?: number;
    hctype?: string;
    dsc_hctype?: string;
    label: string;
    lat: number;
    long: number;
    polygonId: number;
    status: string;
  };
}

export interface FieldMesh {
  fill: {
    mesh: PIXI.Mesh;
    uniform: FillUniform;
  };
  outline: {
    mesh: PIXI.Mesh;
    uniform: OutlineUniform;
  }
}

/** Interface for field config. */
interface Config {
  /** Initial scale of field hash (Default: 1.0). */
  initialHash?: number,
  /** Minimum scale of field hash (Default: 0.0). */
  minHash?: number,
  /** Maximum scale of field hash (Default: Infinity). */
  maxHash?: number,

  /** Provide your custom event handler. */
  customEventHandler?: EventHandler;

  onFeatureHover?: (event: MouseEvent, data: any) => void;
}

// Colors
const red: vec3 = [0.8, 0.0, 0.0];
const green: vec3 = [0.133, 0.6, 0.133];
const pink: vec3 = [1.0, 0.753, 0.796];
const gray: vec3 = [0.6, 0.6, 0.6];

const outlineRed: vec3 = [0.6, 0.0, 0.0];
const outlineGray: vec3 = [0.5, 0.5, 0.5];

/** Module for displaying fields. */
export default class FieldModule extends ModuleInterface {
  /** Vertex shader for the fill. */
  static vertexShaderFill: string;

  /** Fragment shader for the fill. */
  static fragmentShaderFill: string;

  /** Vertex shader for the outlines. */
  static vertexShaderOutline: string;

  /** Fragment shader for the outlines. */
  static fragmentShaderOutline: string;

  /** Collection of fields with meshes. */
  fields: FieldMesh[] = [];

  polygons: GeoJSONPolygon;
  multipolygons: GeoJSONMultiPolygon;

  mapmoving: boolean;

  onFeatureHover: (event: MouseEvent, data: any) => void;

  private _eventHandler: EventHandler;

  private _projector: Projector;

  /** Settings for how to render fields. */
  config: Config = {
    initialHash: 1.0,
    minHash: 0.0,
    maxHash: Infinity,
  };

  highlightActive: boolean = false;
  highlightHits: number[] = [];

  dict: TriangleDictionary<number> = new TriangleDictionary(1.2);
  highlighter: Highlighter;
  labelManager: LabelManager;

  /** Index of previously highlighted field */
  prevField: number = -1;

  constructor(config?: Config) {
    super();

    // Don't continue without config
    this.mapmoving = false;
    this._eventHandler = config && config.customEventHandler || new DefaultEventHandler();
    this.onFeatureHover = config?.onFeatureHover;

    if (!config) return;
    if (config.initialHash && typeof config.initialHash === 'number') this.config.initialHash = config.initialHash;
    if (config.minHash && typeof config.minHash === 'number') this.config.minHash = config.minHash;
    if (config.maxHash && typeof config.maxHash === 'number') this.config.maxHash = config.maxHash;
  }

  get projector() {
    if (!this._projector) this._projector = new Projector(this.pixiOverlay.utils.latLngToLayerPoint);
    return this._projector;
  }

  set(data: Field[]) {
    // Ensure initial hash is clamped
    this.config.initialHash = clamp(this.config.initialHash);

    // Clear fields
    this.fields = [];
    // @ts-ignore
    // window.fieldmodule = this;
    // console.log("setting window")
    // (window as any).fieldmodule = this;

    const textStyle: PIXI.TextStyle = new PIXI.TextStyle({
      fontFamily : 'Arial',
      fontSize: 64,
      fontWeight: '600',
      fill : 0x454545,
      align : 'center'
    });

    this.labelManager = new LabelManager(textStyle, 0.029);
    this.highlighter = new Highlighter(
      // [0.50, 0, 0.50],
      // [0.25, 0, 0.25],
      // [0.35, 0, 0.35],,
      [0.75, 0.36, 0.42],
      [0.42, 0.69, 0.44],
      [0, 1.0, 1.0],
    );

    // Extra loop added to use mouseEvents
    data.forEach(feature => {
      // console.log(feature)
      // if (feature.geometry.type === 'Polygon') {
      //   if (this.polygons === undefined) this.polygons = new GeoJSONPolygon(this.root, this.labelRoot, this.pixiOverlay, this.config);
      //   this.polygons.add(feature, );
      // } else if (feature.geometry.type === 'MultiPolygon') {
      //   if (this.multipolygons === undefined) this.multipolygons = new GeoJSONMultiPolygon(this.root, this.labelRoot, this.pixiOverlay, this.config);
      //   this.multipolygons.add(feature, props);
      // }
    })
    // console.log(data)
    const preprocessedData = preprocessFields(data);
    // console.log(preprocessedData)

    let fieldID = 0;
    let baseZIndex = 0;
    preprocessedData.forEach(field => {
      // console.log(field)
      const name: string = field.properties.label;
      // if (name === 'Troll') return;

      const guid = field.properties.guid;

      const entries: LabelData[] = [];
      const meshes: FieldMesh[] = [];
      field.geometry.forEach(polygon => {
        const fieldStyle: FieldStyle = this.getFieldStyle(guid, polygon.properties.hctype);
        const projected = this.projectPolygons(polygon.coordinates);
        projected.pop(); // Remove overlapping

        const meshData = Mesh.Polygon(projected);
        this.dict.add(polygon.coordinates, meshData.triangles, fieldID);
        const outlineData = Mesh.PolygonOutline(projected, 0.15);
        const [position, mass] = centerOfMass(projected, meshData.triangles);

        meshes.push(
          this.drawPolygons(meshData, outlineData, fieldStyle, baseZIndex),
        );
        baseZIndex += 2;

        entries.push({ position, mass });
      });
      fieldID++;
      this.labelManager.addField(name, entries);
      this.fields.push(...meshes);
      this.highlighter.add(meshes)
    });

    this.labelManager.draw(this.root);
  }

  /**
   * Draw each polygon in a polygon collection.
   * @param polygons
   */
  drawPolygons(meshData: MeshData, outlineData: MeshNormalData, fieldStyle: FieldStyle, zIndex: number): FieldMesh {

    const fillUniform: FillUniform = {
      col1: fieldStyle.fillColor1,
      col2: fieldStyle.fillColor2,
      opacity: fieldStyle.fillOpacity,
      hashed: fieldStyle.hashed,
      hashDisp: Math.random() * 10,
      hashWidth: this.config.initialHash,
    };

    const outlineUniform: OutlineUniform = {
      color: fieldStyle.outlineColor,
      width: 0.2,
    }

    const polygonMesh = Mesh.from(meshData.vertices, meshData.triangles, FieldModule.vertexShaderFill, FieldModule.fragmentShaderFill, fillUniform);
    polygonMesh.zIndex = zIndex;

    this.root.addChild(polygonMesh);

    const polygonOutlineMesh = Mesh.from(outlineData.vertices, outlineData.triangles, FieldModule.vertexShaderOutline, FieldModule.fragmentShaderOutline, outlineUniform, outlineData.normals);
    polygonOutlineMesh.zIndex = zIndex + 1;
    this.root.addChild(polygonOutlineMesh);

    return {
      fill: {
        mesh: polygonMesh,
        uniform: fillUniform,
      },
      outline: {
        mesh: polygonOutlineMesh,
        uniform: outlineUniform,
      },
    }
  }

  /**
   * Get the fill color of a field.
   * @param props Properties of field
   * @returns Color used to fill
   */
  getFieldStyle(guid: number, hctype: string): FieldStyle {
    // If no GUID -> gray
    // if (!guid) {
    //   return {
    //     fillColor1: gray,
    //     fillColor2: gray,
    //     outlineColor: outlineGray,
    //     fillOpacity: 0.15,
    //     hashed: false,
    //   }
    // }

    // Default is gray
    const fill: FieldStyle = {
      fillColor1: gray,
      fillColor2: gray,
      outlineColor: outlineGray,
      fillOpacity: 0.15,
      hashed: false,
    };

    switch(hctype) {
      case 'OIL':
        fill.fillColor1 = green;
        fill.fillColor2 = green;
        fill.outlineColor = green;
        fill.fillOpacity = 0.6;
        break;
      case 'GAS':
        fill.fillColor1 = red;
        fill.fillColor2 = red;
        fill.outlineColor = outlineRed;
        fill.fillOpacity = 0.6;
        break;
      case 'GAS/CONDENSATE':
        fill.fillColor1 = pink;
        fill.fillColor2 = red;
        fill.outlineColor = outlineRed;
        fill.fillOpacity = 0.6;
        fill.hashed = true;
        break;
      case 'OIL/GAS':
        fill.fillColor1 = red;
        fill.fillColor2 = green;
        fill.fillOpacity = 0.6;
        fill.hashed = true;
        break;
    }

    return fill;
  }

  /**
   * Project a collection of polygons.
   * @param points Points within polygons
   * @returns Projected polygons
   */
  projectPolygons(points: [number, number][]): Vector2[] {
    const project = this.pixiOverlay.utils.latLngToLayerPoint;
    return points.map(c => {
      const coord = project([c[1], c[0]]);
      return new Vector2(coord.x, coord.y);
    });
  }

  resize(zoom: number) {

  }

  /*
  resize(outlineScale: number, hashScale: number, labelScale: number): void {
    const clampedHashWidth = clamp(hashScale, this.config.minHash, this.config.maxHash);
    let clampedOutlineWidth = outlineScale - 1;
    if (clampedOutlineWidth < 0) clampedOutlineWidth = 0;
    // const clampedLabelScale = labelScale > 15 ? 15 : labelScale;
    for (let i = 0; i < this.fields.length; i++) {
      const d = this.fields[i];
      d.fill.uniform.hashWidth = clampedHashWidth;
      d.outline.uniform.width = clampedOutlineWidth;
    }

    if (labelScale > 20) {
      if (this.labelManager.visible) this.labelManager.hideLabels();
    } else {
      if (!this.labelManager.visible) this.labelManager.showLabels();
      this.labelManager.resize(labelScale);
    }
  }
  */

  highlight(lat: number, long: number): boolean {
    const field: number = this.dict.getPolygonAt([long, lat]);
    if (!field) {
      if (this.highlighter.revert()) this.pixiOverlay.redraw();
      this.prevField = -1;
      return false;
    };
    // Don't highlight field twice
    if (this.prevField === field) return true;
    this.highlighter.highlight(field);
    this.highlightActive = true;
    this.pixiOverlay.redraw();
    this.prevField = field;
    return true;
  }

  tryUnselect() {
    if (this.highlighter.revert()) this.pixiOverlay.redraw();
    this.prevField = -1;
  }

  onAdd(map: import("leaflet").Map): void {
    const element = this.pixiOverlay.utils.getRenderer().view.parentNode;
    const callbacks = {
      mousemove: this.handleMouseMove.bind(this),
      mouseout: this.handleMouseOut.bind(this),
      click: this.handleMouseClick.bind(this),
      mousedown: this.handleMouseDown.bind(this),
      mouseup: this.handleMouseUp.bind(this),
    };
    this._eventHandler.register(map, element, callbacks);
  }

  onRemove(map: import("leaflet").Map): void {
    this._eventHandler.unregister();
  }

    /**
   * Check for features at the given coordinates.
   * Will give a list of feature data if any are hit or an empty list if not.
   * @param pos Target position in lat-long
   * @returns List of features at the given position
   */
  // testPosition(pos: Vector2) : any {
    testPosition(event: MouseEvent) : any {
      const map = this.pixiOverlay.utils.getMap();
      const latLng = map.mouseEventToLatLng(event);
      const layerCoords = new Vector2([latLng.lng, latLng.lat]);
      // const worldspaceCoord = this.projector.getVector2(latLng);

      // return this.dict.getPolygonAt([pos.x, pos.y]);

      let result = [];
      result.push(this.dict.getPolygonAt([layerCoords.x, layerCoords.y]));
      // if (this.polygons) result.push(this.polygons.testPosition(layerCoords));
      // if (this.multipolygons) result.push(this.multipolygons.testPosition(layerCoords));
      // if (this.linestrings) result.push(this.linestrings.testPosition(worldspaceCoord, this.distanceThreshold));
      // if (this.points) result.push(this.points.testPosition(worldspaceCoord, this.distanceThreshold));
      result = result.filter(v => v);
      // console.log(result)
      return result;
    }

  private handleMouseMove(event: MouseEvent): boolean {
    if(this.mapmoving) return false;
    // console.log(event)
    // console.log(this)
    const hits = this.testPosition(event);
    if (hits.length !== 0 && !arraysEqual(this.highlightHits, hits)) {
      const map = this.pixiOverlay.utils.getMap();
      const latLng = map.mouseEventToLatLng(event);
      this.highlight(latLng.lat, latLng.lng)
      this.highlightHits = hits;
    } else if (hits.length === 0 && this.highlightActive) {
      const map = this.pixiOverlay.utils.getMap();
      const latLng = map.mouseEventToLatLng(event);
      this.highlight(latLng.lat, latLng.lng)
      this.highlightActive = false;
      this.highlightHits = [];
    }
    // const map = this.pixiOverlay.utils.getMap();
    // const latLng = map.mouseEventToLatLng(event);
    // this.highlight(latLng.lat, latLng.lng)

    if (this.onFeatureHover) this.onFeatureHover(event, hits);
    return true;
  }

  private handleMouseOut(event: MouseEvent) : boolean {
    if(this.onFeatureHover) this.onFeatureHover(event, []);
    return true;
  }

  private handleMouseClick() : boolean {
    return true;
  }

  private handleMouseDown() : boolean {
    this.mapmoving = true;
    return true;
  }

  private handleMouseUp() : boolean {
    this.mapmoving = false;
    return true;
  }
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// FILL
FieldModule.vertexShaderFill = `
  attribute vec2 inputVerts;

  uniform mat3 translationMatrix;
  uniform mat3 projectionMatrix;

  varying vec2 verts;

  void main() {
    verts = inputVerts;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(inputVerts, 1.0)).xy, 0.0, 1.0);
  }
`;

FieldModule.fragmentShaderFill = `
  precision mediump float;

  varying vec2 verts;

  uniform vec3 col1;
  uniform vec3 col2;
  uniform float opacity;

  uniform bool hashed;
  uniform float hashDisp;
  uniform float hashWidth;

  void main() {
    if(hashed && mod(verts.y + hashDisp, hashWidth * 2.0) > hashWidth) {
      gl_FragColor = vec4(col2, 1.0) * opacity;
    }
    else {
      gl_FragColor = vec4(col1, 1.0) * opacity;
    }
  }
`;

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// OUTLINE
FieldModule.vertexShaderOutline = `
  attribute vec2 inputVerts;
  attribute vec2 inputNormals;

  uniform mat3 translationMatrix;
  uniform mat3 projectionMatrix;

  uniform float width;

  void main() {
    vec2 pos = inputVerts + inputNormals * width;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
  }
`;

FieldModule.fragmentShaderOutline = `
  precision mediump float;

  uniform vec3 color;

  void main() {
    gl_FragColor = vec4(color, 1.0);
  }
`;
