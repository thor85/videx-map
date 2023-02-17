import * as PIXI from 'pixi.js';
import { ModuleInterface } from './ModuleInterface';
import Mesh, { MeshData, MeshNormalData } from './utils/Mesh';
import centerOfMass from './utils/centerOfMass';
import Highlighter from './utils/fields/Highlighter';
// import preprocessFields from './utils/fields/preprocessFields';
import preprocessDiscoveries from './utils/fields/preprocessDiscoveries';
import LabelManager, { LabelData } from './utils/fields/LabelManager';
import { EventHandler, DefaultEventHandler } from './EventHandler';
import { clamp } from '@equinor/videx-math';
import TriangleDictionary from './utils/TriangleDictionary';
import Vector2 from '@equinor/videx-vector2';
import Projector from './utils/wellbores/Projector';
import { getRadius } from './utils/Radius';
import { Defaults } from './GeoJSONModule/constants';
import { ResizeConfig, LabelResizeConfig } from './ResizeConfigInterface';

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
    dsccurrentactivitystatus?: string;
    dscnpdiddiscovery?: number;
    cmplongname?: string;
    dscownername?: string;
    fldname?: string;
    wlbname?: string;
    dsc_hctype?: string;
    dscdiscoveryyear?: number;
    dschctype?: string;
    dscname?: string;
    dscactstat?: string;
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

  /** Resize configuration of outline. */
  outlineResize?: ResizeConfig;

  labelResize?: LabelResizeConfig;

  /** Provide your custom event handler. */
  customEventHandler?: EventHandler;

  labelsVisible?: boolean;

  onFeatureHover?: (event: MouseEvent, data: any) => void;
  onFeatureClick?: (data: any) => void;
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

  fieldIdFeatures: any = {};

  mapmoving: boolean;

  highlightEnabled: boolean = true;

  onFeatureHover: (event: MouseEvent, data: any) => void;
  onFeatureClick: (data: any) => void;

  private _eventHandler: EventHandler;

  private _projector: Projector;

  /** Settings for how to render fields. */
  config: Config = {
    initialHash: 1.0,
    minHash: 0.0,
    maxHash: Infinity,
    outlineResize: {
      min: { zoom: 7, scale: 0.8 },
      max: { zoom: 17, scale: 0.05 },
    },
    labelResize: {
      min: { zoom: 11, scale: 0.1 },
      max: { zoom: 17, scale: 0.025 },
      baseScale: 0.15,
    },
    labelsVisible: true,
  };

  /** Are the labels hidden? */
  labelsVisible: boolean;

  labelsDrawn: boolean;

  highlightActive: boolean = false;
  highlightHits: number[] = [];

  currentZoom: number = Defaults.INITIAL_ZOOM;

  dict: TriangleDictionary<number> = new TriangleDictionary(1.2);
  highlighter: Highlighter;
  labelManager: LabelManager;

  labelContainer: PIXI.Container;
  fieldMeshContainer: PIXI.Container;

  /** Index of previously highlighted field */
  prevField: number = -1;

  constructor(config?: Config) {
    super();

    this.fieldMeshContainer = new PIXI.Container();
    this.fieldMeshContainer.sortableChildren = true;
    this.root.addChild(this.fieldMeshContainer);
    this.labelContainer = new PIXI.Container();
    this.labelContainer.sortableChildren = true;
    this.root.addChild(this.labelContainer);

    this.labelsVisible = true;
    this.labelsDrawn = false;

    // Don't continue without config
    this.mapmoving = false;
    this._eventHandler = config && config.customEventHandler || new DefaultEventHandler();
    this.onFeatureHover = config?.onFeatureHover;
    this.onFeatureClick = config?.onFeatureClick;

    if (!config) return;
    if (config.hasOwnProperty('labelsVisible')) this.labelsVisible = config.labelsVisible;
    if (config.outlineResize) this.config.outlineResize = config.outlineResize;
    if (config.labelResize) this.config.labelResize = config.labelResize;
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
    this.config.initialHash = clamp(this.config.initialHash, this.config.minHash, this.config.maxHash);

    // Clear fields
    this.fields = [];

    const textStyle: PIXI.TextStyle = new PIXI.TextStyle({
      fontFamily : 'Arial',
      fontSize: 64,
      fontWeight: '600',
      fill : 0x454545,
      align : 'center'
    });

    // const zoom = this.pixiOverlay._map.getZoom();
    // const labelSize = this.getLabelSize(zoom);
    this.labelManager = new LabelManager(textStyle, this.config.labelResize.baseScale);
    // this.labelManager = new LabelManager(textStyle, 0.029);
    this.highlighter = new Highlighter(
      // [0.50, 0, 0.50],
      // [0.25, 0, 0.25],
      // [0.35, 0, 0.35],,
      [0.75, 0.36, 0.42],
      [0.42, 0.69, 0.44],
      [0, 1.0, 1.0],
    );

    // const preprocessedData = preprocessFields(data);
    const preprocessedData = preprocessDiscoveries(data);

    let fieldID = 0;
    let baseZIndex = 0;
    preprocessedData.forEach(field => {
      const name: string = field.properties.label;
      // if (name === 'Troll') return;

      const guid = field.properties.guid;

      const entries: LabelData[] = [];
      const meshes: FieldMesh[] = [];
      // console.log(field)
      field.geometry.forEach(polygon => {
        // console.log(polygon)
        // if (!polygon.hasOwnProperty('coordinates')) return;
        // if (!polygon.coordinates) return;
        // if ((polygon.coordinates).length === 0) return;
        const fieldStyle: FieldStyle = this.getFieldStyle(guid, polygon.properties.hctype);
        const projected = this.projectPolygons(polygon.coordinates);
        projected.pop(); // Remove overlapping

        const meshData = Mesh.Polygon(projected);
        this.dict.add(polygon.coordinates, meshData.triangles, fieldID);
        this.fieldIdFeatures[fieldID] = field;
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

    this.drawLabels()
  }

  drawLabels() {
    if (this.labelsVisible) {
      this.labelManager.draw(this.labelContainer);
      // TODO: improve this...
      const zoom = this.pixiOverlay._map.getZoom();
      const labelSize = this.getLabelSize(zoom);
      this.labelManager.resize(labelSize);
      this.labelsDrawn = true;
    }
  }

  showLabels() {
    this.labelsVisible = true;
    if (!this.labelsDrawn) this.drawLabels();
    this.labelManager.showLabels();
  }

  hideLabels() {
    this.labelsVisible = false;
    this.labelManager.hideLabels();
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

    const zoom = this.pixiOverlay._map.getZoom();
    const outlineRadius = this.getOutlineRadius(zoom);

    const outlineUniform: OutlineUniform = {
      color: fieldStyle.outlineColor,
      width: outlineRadius,
    }

    const polygonMesh = Mesh.from(meshData.vertices, meshData.triangles, FieldModule.vertexShaderFill, FieldModule.fragmentShaderFill, fillUniform);
    polygonMesh.zIndex = zIndex;

    this.fieldMeshContainer.addChild(polygonMesh);

    const polygonOutlineMesh = Mesh.from(outlineData.vertices, outlineData.triangles, FieldModule.vertexShaderOutline, FieldModule.fragmentShaderOutline, outlineUniform, outlineData.normals);
    polygonOutlineMesh.zIndex = zIndex + 1;
    this.fieldMeshContainer.addChild(polygonOutlineMesh);

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
    if (!this.config.outlineResize) return;
    const outlineRadius = this.getOutlineRadius(zoom);

    if (this.config.labelResize && this.labelManager && this.labelsVisible && this.labelsDrawn) {
      const labelSize = this.getLabelSize(zoom);

      // Labels will just get in the way after a certain threshold, so it is better to just hide them
      if (zoom <= this.config.labelResize.threshold || !this.labelsVisible) {
        this.labelManager.hideLabels();
      } else {
        if (this.labelsVisible) this.labelManager.showLabels();
        this.labelManager.resize(labelSize);
      }
    }

    /**
     * This is not the best way to update, ideally we would use global uniforms
     * @example this.pixiOverlay._renderer.globalUniforms.uniforms.outlineWidth = outlineRadius;
     * instead of iterating over every mesh and manually updating each of the selected
     */
    this.fieldMeshContainer.children.map((child) => {
      // console.log(child)
      // @ts-ignore
      if (child.shader.uniformGroup.uniforms.width) {
        // @ts-ignore
        child.shader.uniformGroup.uniforms.width = outlineRadius;
      }
    });
    this.currentZoom = zoom;
  }

  clear() {
      this.fieldMeshContainer.removeChildren();
      this.labelContainer.removeChildren();
      this.dict = new TriangleDictionary(1.2);
      this.labelsDrawn = false;
  }

  getOutlineRadius(zoom: number = this.currentZoom) {
    return getRadius(zoom, this.config.outlineResize);
  }

  getLabelSize(zoom: number = this.currentZoom) {
    return getRadius(zoom, this.config.labelResize);
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
    if (!this.highlightEnabled) return;
    if(this.mapmoving) return false;
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

    let hitsFeatures = [];
    hits.forEach(hit => {hitsFeatures.push(this.fieldIdFeatures[hit])});
    // console.log(hitsFeatures)

    if (this.onFeatureHover) this.onFeatureHover(event, hitsFeatures);
    return true;
  }

  private handleMouseOut(event: MouseEvent) : boolean {
    if (!this.highlightEnabled) return;
    if(this.onFeatureHover) this.onFeatureHover(event, []);
    return true;
  }

  private handleMouseClick(event: MouseEvent) : boolean {
    if (!this.onFeatureClick) return;
    // TODO: Set highlight in handleMouseMove and just retrieve it here?
    const hits = this.testPosition(event);
    if (!hits || hits.length === 0) {return false;};
    if(this.onFeatureClick) this.onFeatureClick(this.fieldIdFeatures[hits]);
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
