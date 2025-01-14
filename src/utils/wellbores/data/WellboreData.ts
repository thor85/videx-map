/* eslint-disable no-magic-numbers, curly, @typescript-eslint/no-explicit-any */
import * as PIXI from 'pixi.js';
import Vector2 from '@equinor/videx-vector2';
import { SourceData } from './SourceData';
import { RootData } from './RootData';
import { Group } from './Group';
import { processIntervals } from '../intervals';
import { LineInterpolator } from '../../LineInterpolator';
import { WellboreMesh } from '../../WellboreMesh';
import { getWellboreShader, WellboreUniforms } from '../Shader';
import { Label } from '../labels/Label';
import { Colors, Color } from '../Colors';
import { TickConfig } from '../Config';

export interface WellboreDataInput {
  data: SourceData,
  group: Group,
  root: RootData,
  /** Projected coordinates. */
  coords: Vector2[],
  /** Threshold for radius considered to be single point. */
  pointThreshold: number;
  wellboreWidth: number;
  tick: TickConfig;
}

export enum WellboreStatus {
  normal, highlighted, multiHighlighted, selected
}

/** Current filter status. Soft leaves gray wellbores, while hard leaves "ghost"-lines */
export enum FilterStatus {
  none, soft, hard,
}

export class WellboreData {

  public static state = {
    wellboreRadius: 1,
    rootRadius: 1,
  };

  data: SourceData;
  group: Group;
  wellboreWidth: number;
  interpolator: LineInterpolator;
  mesh: PIXI.Mesh;
  label: Label;
  private _zIndex: number = 0;

  root: RootData;
  status: WellboreStatus = WellboreStatus.normal;
  private filter: FilterStatus = FilterStatus.none;

  constructor(input: WellboreDataInput) {
    this.data = input.data;
    this.group = input.group;
    this.root = input.root;
    this.wellboreWidth = input.wellboreWidth;
    this.interpolator = new LineInterpolator(input.coords, input.pointThreshold);
    // console.log(input.data.labelShort)
    // console.log(input.data.label)
    // console.log(input.data)
    this.label = new Label(input.data.labelShort, this.colors.fontColor, this.colors.default.labelBg);
    // this.label.visible = false;

    if (this.interpolator.singlePoint) {
      this.label.attachToRoot = true;
    } else {
      // console.log(this.data.status)
      // const intervals = processIntervals(input.data.intervals);
      // console.log(input.data.branch)
      const {intervals, packers} = processIntervals(input.data.intervals);
      let wellboreColor;
      // console.log(this.colors.default)
      if (typeof this.group.colorFunction === 'function') {
        // console.log("function")
        // @ts-ignore
        wellboreColor = this.group.colorFunction(this.data);
      } else {
        wellboreColor = this.colors.default;
      }

      if (wellboreColor) {
        this.mesh = this.createWellboreMesh(this, intervals, packers, {width: input.tick.width, height: this.wellboreWidth * input.tick.height}, wellboreColor);
      } else {
        this.mesh = undefined;
      }

      // console.log(this.mesh)
    }

    // Update WellboreData with current state
    this.update(true);
  }

  set zIndex (val: number) {
    this._zIndex = val;
    // console.log(this.data.branch)
    // console.log(val)
    if (this.mesh) this.mesh.zIndex = this._zIndex;
  }

  get colors(): Colors {
    return this.group.colors;
  }

  get color(): Color {
    const { colors } = this.group;

    switch (this.status) {
      case WellboreStatus.normal:
        return colors.default;
      case WellboreStatus.highlighted:
        return colors.highlight;
      case WellboreStatus.multiHighlighted:
        return colors.multiHighlight;
      case WellboreStatus.selected:
        return colors.selected;
    }
  }

  get active(): boolean {
    const activeUniform = (this.mesh && this.mesh.shader.uniforms.status === 0);
    return this.group.active && (activeUniform || this.filter === FilterStatus.none);
  }

  setFilter(filter: FilterStatus) {
    if (this.filter === filter) return; // If flag is duplicate
    this.filter = filter;
    this.update(!this.group.state.labelsVisible);
  }

  get selected(): boolean {
    return this.status === WellboreStatus.selected;
  }

  get highlighted(): boolean {
    return this.status === WellboreStatus.highlighted || this.status === WellboreStatus.multiHighlighted;
  }

  get order() {
    return this.group.order;
  }

  get uniforms(): WellboreUniforms {
    return this.mesh.shader.uniforms as WellboreUniforms;
  }

  private createWellboreMesh(wellboreData: WellboreData, screens: [number, number, number, number][], packers: [number, number][], tick: TickConfig, wellboreColor: Color): PIXI.Mesh {
    const line = new WellboreMesh(this.interpolator, this.wellboreWidth, tick, wellboreData);
    const { vertices, triangles, vertexData, extraData, logData } = line.generate(screens, packers);

    // Create geometry
    const geometry = new PIXI.Geometry();
    geometry.addAttribute('verts', vertices, 2);
    geometry.addAttribute('vertCol', vertexData, 4);
    geometry.addAttribute('typeData', extraData, 1);
    geometry.addAttribute('logData', logData, 1);
    geometry.addIndex(triangles);

    // const shader: any = getWellboreShader(this.colors.default, this.group.state.completionVisible, this.group.state.wellboreVisible);
    const shader: any = getWellboreShader(
      wellboreColor,
      this.group.state.completionVisible,
      this.group.state.wellboreVisible,
      this.group.state.colorByLog,
      this.group.state.hidePathWithoutInterval,
      this.group.state.shadeWellbore,
      this.group.logColormap,
    );
    return new PIXI.Mesh(geometry, shader);
  }

  setCompletionVisibility(visible: boolean) {
    if (this.mesh) this.uniforms.completionVisible = visible;
  }

  setWellboreVisibility(visible: boolean) {
    if (this.mesh) this.uniforms.wellboreVisible = visible;
  }

  setColorByLog(colorByLog: boolean) {
    if (this.mesh) this.uniforms.colorByLog = colorByLog;
  }

  setHighlight(isHighlighted: boolean, multiple: boolean = false) : void {
    if (this.status === WellboreStatus.selected) return;

    if (isHighlighted) {
      this.status = multiple ? WellboreStatus.multiHighlighted : WellboreStatus.highlighted;
    }
    else this.status = WellboreStatus.normal;

    if (isHighlighted) {
      const color = multiple ? this.colors.multiHighlight : this.colors.highlight;
      if (this.mesh) {
        this.mesh.shader.uniforms.wellboreColor1 = color.col1;
        this.mesh.shader.uniforms.wellboreColor2 = color.col2;
        this.mesh.shader.uniforms.forceColor = true;
        this.mesh.zIndex = this._zIndex + 100000;
      }
      // this.label.background.tint = color.labelBg;
      // this.label.background.alpha = 0.75;
      // this.label.background.zIndex = 2;
      this.label.text.zIndex = 3;
      this.label.text.tint = this.colors.interactFontColor;
    } else {
      if (this.mesh) {
        let wellboreColor;
        if (typeof this.group.colorFunction === 'function') {
          // @ts-ignore
          wellboreColor = this.group.colorFunction(this.data);
        } else {
          wellboreColor = this.colors.default;
        }
        this.mesh.shader.uniforms.wellboreColor1 = wellboreColor.col1;
        this.mesh.shader.uniforms.wellboreColor2 = wellboreColor.col2;
        this.mesh.shader.uniforms.forceColor = false;
        this.mesh.zIndex = this._zIndex;
      }
      // this.label.background.tint = this.colors.default.labelBg;
      // this.label.background.alpha = Label.config.backgroundOpacity;
      // this.label.background.zIndex = 0;
      this.label.text.zIndex = 1;
      this.label.text.tint = this.colors.fontColor;
      // this.label.text.tint = 0xFF0000;
    }
  }

  setSelected(isSelected: boolean) : void {
    this.status = isSelected ? WellboreStatus.selected : WellboreStatus.normal;

    if (isSelected) {
      if (this.mesh) {
        this.mesh.shader.uniforms.wellboreColor1 = this.colors.selected.col1;
        this.mesh.shader.uniforms.wellboreColor2 = this.colors.selected.col2;
        this.mesh.shader.uniforms.forceColor = true;
        this.mesh.zIndex = this._zIndex + 1000000;
      }
      // this.label.background.tint = this.colors.selected.labelBg;
      // this.label.background.alpha = 0.75;
      // this.label.background.zIndex = 2
      this.label.text.zIndex = 3;
    } else {
      if (this.mesh) {
        this.mesh.shader.uniforms.wellboreColor1 = this.colors.default.col1;
        this.mesh.shader.uniforms.wellboreColor2 = this.colors.default.col2;
        this.mesh.shader.uniforms.forceColor = false;
        this.mesh.zIndex = this._zIndex;
      }
      // this.label.background.tint = this.colors.default.labelBg;
      // this.label.background.alpha = Label.config.backgroundOpacity;
      // this.label.background.zIndex = 0;
      this.label.text.zIndex = 1;
      // this.label.text.tint = 0xFF0000;
    }
    this.label.text.tint = this.colors.fontColor;
    this.root.recalculate();
  }

  update(labelForceHide=!this.group.state.labelsVisible) : void {
    const active = (this.group.active && this.filter === FilterStatus.none);
    if (this.mesh) {
      let status = this.filter;
      if (!this.group.active) status = 4;
      this.mesh.shader.uniforms.status = status;
      this.mesh.shader.uniforms.wellboreRadius = WellboreData.state.wellboreRadius;
      this.mesh.shader.uniforms.rootRadius = WellboreData.state.rootRadius;
      // this.mesh.shader.uniforms.ghost = this.group.active && !this.isActive;
    }
    // Workaround to make labels start hidden
    if (labelForceHide) this.label.visible = false;
    else this.label.visible = active;
  }
}
