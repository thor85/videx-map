import * as PIXI from 'pixi.js';
import Vector2 from '@equinor/videx-vector2';
import { ModuleInterface } from '../ModuleInterface';
import { EventHandler, DefaultEventHandler } from '../EventHandler';
import {
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
  GeoJSONLineString,
  GeoJSONPoint,
  FeatureProps,
} from '.';
import { ResizeConfig, LabelResizeConfig } from '../ResizeConfigInterface';
import Projector from '../utils/wellbores/Projector';

/** Interface for config. */
interface Config {
  customEventHandler?: EventHandler;
  onFeatureHover?: (event: MouseEvent, data: any) => void;
  outlineResize?: ResizeConfig;
  labelResize?: LabelResizeConfig;
  distanceThreshold?: number;
}

/** Module for displaying fields. */
export default class GeoJSONModule extends ModuleInterface {

  onFeatureHover: (event: MouseEvent, data: any) => void;
  points: GeoJSONPoint;
  linestrings: GeoJSONLineString;
  polygons: GeoJSONPolygon;
  multipolygons: GeoJSONMultiPolygon;
  _eventHandler: EventHandler;
  mapmoving: boolean;
  labelRoot: PIXI.Container
  distanceThreshold: number;
  config?: Config;
  private _projector: Projector;
  labelsDrawn: boolean;

  constructor(config?: Config) {
    super();
    this.mapmoving = false;
    this._eventHandler = config?.customEventHandler || new DefaultEventHandler();
    this.onFeatureHover = config?.onFeatureHover;
    this.config = config;
    this.distanceThreshold = config.distanceThreshold || 200;
    this.labelsDrawn = false;
  }

  get projector() {
    if (!this._projector) this._projector = new Projector(this.pixiOverlay.utils.latLngToLayerPoint);
    return this._projector;
  }

  clear() {
    if (this.points) {
      this.points.spawned.forEach((el) => { el.destroy(); });
      this.points = undefined;
    }
    if (this.linestrings) {
      this.linestrings = undefined;
    }
    if (this.polygons) {
      this.polygons.container.removeChildren();
      this.polygons.labels.container.removeChildren();
      this.polygons = undefined;
    }
    if (this.multipolygons) {
      this.multipolygons.container.removeChildren();
      this.multipolygons.labels.container.removeChildren();
      this.multipolygons = undefined;
    }
    this.labelsDrawn = false;
  }

  set(data: GeoJSON.FeatureCollection, props?: (feature: any) => FeatureProps, labelsVisible = false) {
    this.labelRoot = new PIXI.Container();
    data.features.forEach(feature => {
      if(feature.geometry.type === 'Point') {
        if (this.points === undefined) this.points = new GeoJSONPoint(this.root, this.pixiOverlay);
        this.points.add(feature, props);
      } else if (feature.geometry.type === 'LineString') {
        if (this.linestrings === undefined) this.linestrings = new GeoJSONLineString(this.root, this.pixiOverlay, this.config);
        this.linestrings.add(feature, props);
      } else if (feature.geometry.type === 'Polygon') {
        if (this.polygons === undefined) this.polygons = new GeoJSONPolygon(this.root, this.labelRoot, this.pixiOverlay, this.config);
        this.polygons.add(feature, props);
      } else if (feature.geometry.type === 'MultiPolygon') {
        if (this.multipolygons === undefined) this.multipolygons = new GeoJSONMultiPolygon(this.root, this.labelRoot, this.pixiOverlay, this.config);
        this.multipolygons.add(feature, props);
      }

    });
    this.root.addChild(this.labelRoot);
    if (labelsVisible) {
      this.drawLabels();
    }
  }

  drawLabels() {
    if (!this.labelsDrawn) {
      this.labelsDrawn = true;
      if (this.polygons) this.polygons.drawLabels();
      if (this.multipolygons) this.multipolygons.drawLabels();
    }
  }

  showLabels() {
    if (!this.labelsDrawn) {
      this.drawLabels();
    }
    if (this.polygons) {
      this.polygons.labelsVisible = true;
      this.polygons.labels.showLabels();
    }
    if (this.multipolygons) {
      this.multipolygons.labelsVisible = true;
      this.multipolygons.labels.showLabels();
    }
  }

  hideLabels() {
    if (!this.labelsDrawn) {
      this.drawLabels();
    }
    if (this.polygons) {
      this.polygons.labelsVisible = false;
      this.polygons.labels.hideLabels();
    }
    if (this.multipolygons) {
      this.multipolygons.labelsVisible = false;
      this.multipolygons.labels.hideLabels();
    }
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
    const worldspaceCoord = this.projector.getVector2(latLng);

    let result = [];
    if (this.polygons) result.push(this.polygons.testPosition(layerCoords));
    if (this.multipolygons) result.push(this.multipolygons.testPosition(layerCoords));
    if (this.linestrings) result.push(this.linestrings.testPosition(worldspaceCoord, this.distanceThreshold));
    if (this.points) result.push(this.points.testPosition(worldspaceCoord, this.distanceThreshold));
    result = result.filter(v => v);
    return result;
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

  resize(zoom: number) {
    if (this.points) this.points.resize(zoom);
    if (this.linestrings) this.linestrings.resize(zoom);
    if (this.polygons) this.polygons.resize(zoom);
    if (this.multipolygons) this.multipolygons.resize(zoom);
  }

  private handleMouseMove(event: MouseEvent): boolean {
    if(this.mapmoving) return false;
    const hits = this.testPosition(event);
    if(this.onFeatureHover) this.onFeatureHover(event, hits);
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
