/* eslint-disable curly */
import * as PIXI from 'pixi.js';
import Vector2 from '@equinor/videx-vector2';

import { ModuleInterface } from '../ModuleInterface';
import { EventHandler, DefaultEventHandler } from '../EventHandler';
import { default as GeoJSONMultiPolygon } from './multipolygon';
import { default as GeoJSONPolygon } from './polygon';
import { default as GeoJSONLineString } from './linestring';
import { default as GeoJSONPoint } from './point';
import { ResizeConfig, LabelResizeConfig } from '../ResizeConfigInterface';
import Projector from '../utils/wellbores/Projector';
import { FeatureProps } from './interfaces';

/** Interface for config. */
interface Config {
  customEventHandler?: EventHandler;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  onFeatureHover?: (event: MouseEvent, data: any) => void;
  onFeatureClick?: (data: any) => void;
  outlineResize?: ResizeConfig;
  labelResize?: LabelResizeConfig;
  distanceThreshold?: number;
}

/** Module for displaying fields. */
export default class GeoJSONModule extends ModuleInterface {

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  onFeatureHover: (event: MouseEvent, data: any) => void;
  onFeatureClick: (data: any) => void;
  points: GeoJSONPoint;
  linestrings: GeoJSONLineString;
  polygons: GeoJSONPolygon;
  multipolygons: GeoJSONMultiPolygon;
  _eventHandler: EventHandler;
  mapmoving: boolean;
  labelRoot: PIXI.Container
  distanceThreshold: number;
  config?: Config;
  highlightEnabled: boolean;
  private _projector: Projector;
  labelsDrawn: boolean;
  polygonContainer: PIXI.Container;
  pointDictionaryOptions: any;

  constructor(config?: Config) {
    super();
    this.mapmoving = false;
    this._eventHandler = config?.customEventHandler || new DefaultEventHandler();
    this.onFeatureHover = config?.onFeatureHover;
    this.onFeatureClick = config?.onFeatureClick;
    this.config = config;
    this.distanceThreshold = config.distanceThreshold || 200;
    this.labelsDrawn = false;
    this.highlightEnabled = true;
    this.polygonContainer = new PIXI.Container();
    this.polygonContainer.sortableChildren = true;
    this.root.addChild(this.polygonContainer);
    this.pointDictionaryOptions = [100, 500, 4];
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
      this.linestrings.container.removeChildren();
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
        if (this.points === undefined) this.points = new GeoJSONPoint(this.root, this.pixiOverlay, this.pointDictionaryOptions);
        this.points.add(feature, props);
      // MultiLineString not supported yet
      } else if (feature.geometry.type === 'LineString') {
        if (this.linestrings === undefined) this.linestrings = new GeoJSONLineString(this.root, this.pixiOverlay, this.config);
        this.linestrings.add(feature, props);
      } else if (feature.geometry.type === 'Polygon') {
        if (this.polygons === undefined) this.polygons = new GeoJSONPolygon(this.polygonContainer, this.labelRoot, this.pixiOverlay, this.config);
        // if (this.polygons === undefined) this.polygons = new GeoJSONPolygon(this.root, this.labelRoot, this.pixiOverlay, this.config);
        this.polygons.add(feature, props);
        // this.highlighter.add(meshes)
      } else if (feature.geometry.type === 'MultiPolygon') {
        if (this.multipolygons === undefined) this.multipolygons = new GeoJSONMultiPolygon(this.polygonContainer, this.labelRoot, this.pixiOverlay, this.config);
        // if (this.multipolygons === undefined) this.multipolygons = new GeoJSONMultiPolygon(this.root, this.labelRoot, this.pixiOverlay, this.config);
        this.multipolygons.add(feature, props);
      }

    });
    if (this.points) {
      const map = this.pixiOverlay.utils.getMap()
      this.points.highlighter.zoom = map.getZoom();
    }
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
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  testPosition(event: MouseEvent) : any {
    // console.log(event)
    // console.log("testPosition")
    // console.log(this.onFeatureHover)
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

  onAdd(map: import('leaflet').Map): void {
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
    if (!this.highlightEnabled) return;
    if (this.mapmoving) return false;
    if (!this.visibility) return false;
    const hits = this.testPosition(event);
    if(this.onFeatureHover) this.onFeatureHover(event, hits);
    return true;
  }

  private handleMouseOut(event: MouseEvent) : boolean {
    if (!this.highlightEnabled) return;
    if (!this.visibility) return false;
    if(this.onFeatureHover) this.onFeatureHover(event, []);
    return true;
  }

  private handleMouseClick(event: MouseEvent) : boolean {
    if (!this.onFeatureClick) return;
    if (!this.visibility) return false;
    // console.log("handleMouseClick")
    // TODO: Set highlight in handleMouseMove and just retrieve it here?
    const hits = this.testPosition(event);
    if (!hits || hits.length === 0) {return false;};
    if(this.onFeatureClick) this.onFeatureClick(hits[0]);
    return true;
  }

  private handleMouseDown() : boolean {
    if (!this.visibility) return false;
    this.mapmoving = true;
    return true;
  }

  private handleMouseUp() : boolean {
    if (!this.visibility) return false;
    this.mapmoving = false;
    return true;
  }
}
