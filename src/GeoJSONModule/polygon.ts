/* eslint-disable no-magic-numbers, curly, @typescript-eslint/no-explicit-any */
import * as PIXI from 'pixi.js';
// import { color } from 'd3';
import { color } from 'd3-color';
import { clamp } from '@equinor/videx-math';
import Vector2 from '@equinor/videx-vector2';

import { pixiOverlayBase } from '../pixiOverlayInterfaces';
import Mesh, { MeshData, MeshNormalData } from '../utils/Mesh';
import centerOfMass from '../utils/centerOfMass';
import GeoJSONLabels from './labels';
import TriangleDictionary from '../utils/TriangleDictionary';
import { FeatureProps, FeatureStyle } from '.';
import {
  GeoJSONFragmentShaderFill,
  GeoJSONFragmentShaderOutline,
  GeoJSONVertexShaderFill,
  GeoJSONVertexShaderOutline,
} from './shader';
import { getRadius } from '../utils/Radius';
import { ResizeConfig, LabelResizeConfig } from '../ResizeConfigInterface';
import { Defaults } from './constants';
import Highlighter from './HighlighterMesh';

type vec3 = [number, number, number];

export interface FillUniform {
  col1: vec3;
  col2: vec3;
  opacity: number;
  hashed: boolean;
  hashDisp: number;
  hashWidth: number;
}

export interface OutlineUniform {
  color: vec3;
  outlineWidth: number;

}

export interface PolygonFeatureMesh {
  fill: {
    mesh: PIXI.Mesh;
    uniform: FillUniform;
  };
  outline: {
    mesh: PIXI.Mesh;
    uniform: OutlineUniform;
  };
}

/** Interface for feature config. */
interface Config {
  /** Initial scale of feature hash (Default: 1.0). */
  initialHash?: number,
  /** Minimum scale of feature hash (Default: 0.0). */
  minHash?: number,
  /** Maximum scale of feature hash (Default: Infinity). */
  maxHash?: number,
  /**Label font family, default Arial */
  labelFontFamily?: string,
  /**Label font size, default 64 */
  labelFontSize?: number,
  /**Label font weight, default 600 */
  labelFontWeight?: string,
  /**Label fill color, default 0x454545 */
  labelColor?: string | number,
  /**Label alignment, default Center  */
  labelAlign?: string,
  /** Resize configuration of outline. */
  outlineResize?: ResizeConfig;
  /** Resize configuration for labels. */
  labelResize?: LabelResizeConfig;
}

/** Container for GeoJSON Polygon features. */
export default class GeoJSONPolygon {
  /** Vertex shader for the fill. */
  static vertexShaderFill: string;

  /** Fragment shader for the fill. */
  static fragmentShaderFill: string;

  /** Vertex shader for the outlines. */
  static vertexShaderOutline: string;

  /** Fragment shader for the outlines. */
  static fragmentShaderOutline: string;

  /** Collection of features with meshes. */
  features: PolygonFeatureMesh[] = [];

  /** Are the labels hidden? */
  labelsVisible: boolean;

  highlighter: Highlighter;

  highlighterForced: Highlighter;

  /** Settings for how to render data. */
  config: Config = {
    initialHash: Defaults.INITIAL_HASH,
    minHash: Defaults.DEFAULT_MIN_HASH,
    maxHash: Infinity,
  };

  container: PIXI.Container;
  pixiOverlay: pixiOverlayBase;
  dict: TriangleDictionary<any> = new TriangleDictionary(1.2);
  textStyle: PIXI.TextStyle;
  labels: GeoJSONLabels;
  currentZoom: number = Defaults.INITIAL_ZOOM;
  outlineThickness: number = Defaults.DEFAULT_LINE_WIDTH;
  zIndex: number = Defaults.DEFAULT_Z_INDEX;

  /** Index of previously highlighted polygon */
  prevHighlighted: number = -1;

  polygonId: number = 0;

  constructor(root: PIXI.Container, labelRoot: PIXI.Container, pixiOverlay: pixiOverlayBase, config?: Config) {
    if (config?.initialHash && typeof config.initialHash === 'number') this.config.initialHash = config.initialHash;
    if (config?.minHash && typeof config.minHash === 'number') this.config.minHash = config.minHash;
    if (config?.maxHash && typeof config.maxHash === 'number') this.config.maxHash = config.maxHash;

    // this.container = new PIXI.Container();
    // this.container.sortableChildren = true;
    // root.addChild(this.container);
    this.container = root;

    this.labelsVisible = false;

    this.pixiOverlay = pixiOverlay;
    this.features = [];
    if (config) this.config = config;
    this.config.initialHash = clamp(this.config.initialHash);

    this.textStyle = new PIXI.TextStyle({
      fontFamily: config?.labelFontFamily || Defaults.DEFAULT_FONT_FAMILY,
      fontSize: config?.labelFontSize * 2 || Defaults.DEFAULT_FONT_SIZE * 2,
      fontWeight: (config?.labelFontWeight || Defaults.DEFAULT_FONT_WEIGHT) as PIXI.TextStyleFontWeight,
      fill: config?.labelColor || Defaults.DEFAULT_LABEL_COLOR,
      align: (config?.labelAlign || Defaults.DEFAULT_LABEL_ALIGN) as PIXI.TextStyleAlign,
    });

    this.highlighter = new Highlighter([0, 255, 255], false, false);
    // this.highlighter = new Highlighter([0, 255, 255], [255, 0, 0], 1.0);
    this.highlighterForced = new Highlighter([0, 0, 0], [0, 255, 255], 1.0);

    this.labels = new GeoJSONLabels(labelRoot || this.container, this.textStyle, this.config.labelResize?.baseScale || Defaults.DEFAULT_BASE_SCALE, this);

  }

  add(feature: GeoJSON.Feature, props: (feature: object) => FeatureProps) {
    const zoom = this.pixiOverlay._map.getZoom();
    const geom = feature.geometry as GeoJSON.Polygon;
    const properties: FeatureProps = props(feature);
    if (properties.style.labelScale) this.labels.baseScale = properties.style.labelScale;
    const meshes: PolygonFeatureMesh[] = [];
    const coordinates = geom.coordinates as [number, number][][];
    if(coordinates?.length > 0) {
      const projected = this.projectPolygons(coordinates[0]);
      projected.pop(); // Remove overlapping

      const meshData = Mesh.Polygon(projected);
      this.dict.add(coordinates[0], meshData.triangles, {
        id: this.polygonId,
        properties: feature.properties
      });
      this.polygonId++;

      const outlineRadius = this.getOutlineRadius(zoom);
      const outlineData = Mesh.PolygonOutline(projected, outlineRadius);
      // this.highlighter.add(outlineData)
      // const outlineData = Mesh.PolygonOutline(projected, this.outlineThickness);
      const [position, mass] = centerOfMass(projected, meshData.triangles);

      let labelLoc = {};
      if (feature.properties.labelLocLat) labelLoc['lat'] = feature.properties.labelLocLat;
      if (feature.properties.labelLocLng) labelLoc['lng'] = feature.properties.labelLocLng;
      if (feature.properties.labelLocAngle) labelLoc['angle'] = feature.properties.labelLocAngle;
      if (properties.labelLocLat) labelLoc['lat'] = properties.labelLocLat;
      if (properties.labelLocLng) labelLoc['lng'] = properties.labelLocLng;
      if (properties.labelLocAngle) labelLoc['angle'] = properties.labelLocAngle;

      meshes.push(
        this.drawPolygons(this.container, meshData, outlineData, properties.style, this.zIndex),
      );
      this.zIndex = this.zIndex + 1;

      if (properties.label) this.labels.addLabel(properties.label, { position, mass, labelLoc });
      this.features.push(...meshes);
      this.highlighter.add(meshes);
      this.highlighterForced.add(meshes);
    }
  }

  /**
   * Draw each polygon in a polygon collection.
   * @param polygons
   */
  drawPolygons(container: PIXI.Container, meshData: MeshData, outlineData: MeshNormalData, featureStyle: FeatureStyle, zIndex: number): PolygonFeatureMesh {
    const fillColor = featureStyle.fillColor ? color(featureStyle.fillColor).rgb() : undefined;
    const fillColor2 = featureStyle.fillColor2 ? color(featureStyle.fillColor2).rgb() : undefined;
    const fillUniform: FillUniform = {
      col1: fillColor ? [fillColor.r, fillColor.g, fillColor.b] : [0, 0, 0],
      col2: fillColor2 ? [fillColor2.r, fillColor2.g, fillColor2.b] : [0, 0, 0],
      opacity: featureStyle.fillOpacity,
      hashed: featureStyle.hashed,
      hashDisp: Math.random() * 10,
      hashWidth: this.config.initialHash,
    };

    const zoom = this.pixiOverlay._map.getZoom();
    const outlineRadius = this.getOutlineRadius(zoom);
    const lineColor = color(featureStyle.lineColor).rgb();
    const outlineUniform: OutlineUniform = {
      color: [lineColor.r, lineColor.g, lineColor.b],
      outlineWidth: outlineRadius,
      // outlineWidth: featureStyle.lineWidth,
    }

    const polygonMesh = Mesh.from(meshData.vertices, meshData.triangles, GeoJSONVertexShaderFill, GeoJSONFragmentShaderFill, fillUniform);
    polygonMesh.zIndex = zIndex;

    container.addChild(polygonMesh);

    const polygonOutlineMesh = Mesh.from(outlineData.vertices,
      outlineData.triangles,
      GeoJSONVertexShaderOutline,
      GeoJSONFragmentShaderOutline,
      outlineUniform,
      outlineData.normals);
    // polygonOutlineMesh.zIndex = zIndex + 1;
    polygonOutlineMesh.zIndex = zIndex;
    container.addChild(polygonOutlineMesh);

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

  drawLabels(): void {
    this.labelsVisible = true;
    this.labels.draw(this.getLabelSize(this.pixiOverlay._map.getZoom()));
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

    // if (this.config.labelResize && this.labelsVisible) {
    //   console.log(this.config.labelResize)
    //   const labelSize = this.getLabelSize(zoom);

    //   // Labels will just get in the way after a certain threshold, so it is better to just hide them
    //   if (zoom <= this.config.labelResize.threshold) {
    //     this.labels.hideLabels();
    //   } else {
    //     if (this.labelsVisible) this.labels.showLabels();
    //     this.labels.resize(labelSize);
    //   }
    // }

    /**
     * This is not the best way to update, ideally we would use global uniforms
     * @example this.pixiOverlay._renderer.globalUniforms.uniforms.outlineWidth = outlineRadius;
     * instead of iterating over every mesh and manually updating each of the selected
     */
    this.container.children.map((child: object) => {
      /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
      // @ts-ignore
      if (child.shader.uniformGroup.uniforms.outlineWidth) {
        /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
        // @ts-ignore
        child.shader.uniformGroup.uniforms.outlineWidth = outlineRadius;
      }
    });
    this.currentZoom = zoom;
  }

  forceHighlightOn(polygonId: number) {
    if (!polygonId) return;

    this.highlighter.revert()
    this.highlighterForced.highlight(polygonId);
    this.pixiOverlay.redraw();
  }

  forceHighlightTest(name: string) {
    this.dict.polygonValues.every(el => {
      if (el.properties.prospectName === name) {
        // console.log(el.id);
        return false;
      }
      return true;
    })
  }

  forceHighlightOff() {
    this.highlighterForced.revert()
    this.pixiOverlay.redraw();
  }

  testPosition(pos: Vector2) : any {
    const hitPolygon = this.dict.getPolygonAt([pos.x, pos.y]);
    if (hitPolygon) {
      // console.log(this.dict)
      // console.log("Hit a polygon")
      // console.log(hitPolygon)
      // console.log(this.prevHighlighted )
      // console.log(hitPolygon.id)
      // Don't highlight field twice
      if (this.prevHighlighted !== hitPolygon.id) {
        this.highlighter.highlight(hitPolygon.id);
        this.prevHighlighted = hitPolygon.id;
        this.pixiOverlay.redraw();
      }
      return hitPolygon.properties
    } else {
      // console.log("Did not hit a polygon")
      if (this.highlighter.revert()) {this.pixiOverlay.redraw();}
      this.prevHighlighted = -1;
      return hitPolygon;
    }
    // console.log(hitPolygon)
    // return hitPolygon.properties
  }

  getOutlineRadius(zoom: number = this.currentZoom) {
    return getRadius(zoom, this.config.outlineResize);
  }

  getLabelSize(zoom: number = this.currentZoom) {
    return getRadius(zoom, this.config.labelResize);
  }
}
