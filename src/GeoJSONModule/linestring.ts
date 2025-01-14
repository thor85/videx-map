/* eslint-disable no-magic-numbers, curly */
import * as PIXI from 'pixi.js';
// import { color } from 'd3';
import { color } from 'd3-color';
import Vector2 from '@equinor/videx-vector2';

import { pixiOverlayBase } from '../pixiOverlayInterfaces';
import Mesh, { MeshNormalData } from '../utils/Mesh';
import LineDictionary from '../utils/LineDictionary';
import { FeatureProps, FeatureStyle } from '.';
import { GeoJSONFragmentShaderOutline, GeoJSONVertexShaderOutline } from './shader';
import { getRadius } from '../utils/Radius';
import { ResizeConfig } from '../ResizeConfigInterface';
import { Defaults } from './constants';
import Highlighter from './HighlighterMesh';
import { FeatureMesh } from './HighlighterMesh';

type vec3 = [number, number, number];

interface OutlineUniform {
  color: vec3;
  outlineWidth: number;
}


/** Interface for field config. */
interface Config {
  outlineResize?: ResizeConfig;
}

/** Module for displaying fields. */
export default class GeoJSONLineString {
  /** Vertex shader for the outlines. */
  static vertexShaderOutline: string;

  /** Fragment shader for the outlines. */
  static fragmentShaderOutline: string;

  /** Collection of features with meshes. */
  features: FeatureMesh[] = [];

  /** Settings for how to render fields. */
  config: Config = {
  };

  container: PIXI.Container;
  pixiOverlay: pixiOverlayBase;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  dict: LineDictionary<any> = new LineDictionary(1.2);
  textStyle: PIXI.TextStyle;
  currentZoom: number = Defaults.INITIAL_ZOOM;
  highlighter: Highlighter;

  /** Index of previously highlighted line */
  prevHighlighted: number = -1;

  lineId: number = 0;

  constructor(root: PIXI.Container, pixiOverlay: pixiOverlayBase, config?: Config) {

    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    root.addChild(this.container);

    this.pixiOverlay = pixiOverlay;
    this.features = [];
    this.config = config;
    this.highlighter = new Highlighter([0, 255, 255]);
  }

  add(feature: GeoJSON.Feature, props: (feature: object) => FeatureProps) {

    const geom = feature.geometry as GeoJSON.LineString;
    const properties: FeatureProps = props(feature);

    const meshes: FeatureMesh[] = [];
    const coordinates = geom.coordinates as [number, number][];
    if(coordinates?.length > 0) {
      const projected = this.projectPolygons(coordinates);
      projected.pop(); // Remove overlapping

      // this.dict.add(projected, feature.properties);
      this.dict.add(projected, {
        id: this.lineId,
        properties: feature.properties
      });
      this.lineId++;
      const outlineData = Mesh.SimpleLine(projected, Defaults.DEFAULT_LINE_WIDTH);

      meshes.push(
        this.drawPolygons(this.container, outlineData, properties.style, Defaults.DEFAULT_Z_INDEX),
      );
      this.features.push(...meshes);
      this.highlighter.add(meshes);
    }
  }

  /**
   * Draw each polygon in a polygon collection.
   * @param polygons
   */
  drawPolygons(container: PIXI.Container, outlineData: MeshNormalData, featureStyle: FeatureStyle, zIndex: number): FeatureMesh {

    const lineColor = color(featureStyle.lineColor).rgb();
    const outlineUniform: OutlineUniform = {
      color: [lineColor.r, lineColor.g, lineColor.b],
      outlineWidth: featureStyle.lineWidth,
    }

    const polygonOutlineMesh = Mesh.from(outlineData.vertices,
      outlineData.triangles,
      GeoJSONVertexShaderOutline,
      GeoJSONFragmentShaderOutline,
      outlineUniform,
      outlineData.normals);
    polygonOutlineMesh.zIndex = zIndex;
    container.addChild(polygonOutlineMesh);

    return {
      outline: {
        mesh: polygonOutlineMesh,
        uniform: outlineUniform,
      },
    }
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

    /**
     * This is not the best way to update, ideally we would use global uniforms
     * @example this.pixiOverlay._renderer.globalUniforms.uniforms.outlineWidth = outlineRadius;
     * instead of iterating over every mesh and manually updating each of the selected
     */
    this.container.children.map((child: PIXI.DisplayObject) => {
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

  // TODO: Make distanceThreshold a config setting in the module
  testPosition(pos: Vector2, distanceThreshold: number = 2.0) : any {
    const hitPolygon = this.dict.getClosest(pos, distanceThreshold);
    if (hitPolygon) {
      // Don't highlight twice
      if (this.prevHighlighted !== hitPolygon.id) {
        this.highlighter.highlight(hitPolygon.id);
        this.prevHighlighted = hitPolygon.id;
        this.pixiOverlay.redraw();
      }
      return hitPolygon.properties
    } else {
      if (this.highlighter.revert()) {this.pixiOverlay.redraw();}
      this.prevHighlighted = -1;
      return hitPolygon;
    }
  }

  getOutlineRadius(zoom: number = this.currentZoom) {
    return getRadius(zoom, this.config.outlineResize);
  }
}
