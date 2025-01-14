/* eslint-disable no-magic-numbers */
import Vector2 from '@equinor/videx-vector2';

import { Label } from './Label';
import { WellboreData } from '../data';

export function positionAtRoot(wellbore: WellboreData, position: number) : void {
  wellbore.label.attachToRoot = true;

  // const { text, background } = wellbore.label;
  const { text } = wellbore.label;
  const { scale, rootDisplacement } = Label.state;

  text.anchor.set(0.5, 0);
  text.rotation = 0;
  // background.rotation = 0;
  // background.pivot.set(0, -Label.height * 0.5);
  const yPos = (rootDisplacement + 5 * scale) + (position * (Label.height + 5) * scale) + wellbore.root.position[1];
  text.position.set(wellbore.root.position[0], yPos);
  text.scale.set(scale); // Resize
  // background.position.set(wellbore.root.position[0], yPos);
  // background.scale.set(scale); // Resize
}

export function positionAlongWellbore(wellbore: WellboreData) : void {
  wellbore.label.attachToRoot = false;

  // const { text, background, metrics } = wellbore.label;
  const { text, metrics } = wellbore.label;

  const end = wellbore.interpolator.GetPoint(1).position;
  const width = metrics.width * Label.state.scale; // Multiply by scale
  // const start = wellbore.interpolator.GetPointFromEnd(width);
  const start = wellbore.interpolator.GetPointFromEnd(0.9999);
  const dir = Vector2.sub(end, start.position).mutable;

  // if (metrics.lines[0] === '(1998) P-14 AHT2') {
  //   console.log(text)
  //   console.log(metrics)
  //   console.log(start)
  //   console.log(end)
  //   console.log(dir)
  // }

  let anchorX, anchorY;
  // let pivotX, pivotY;
  let angle;
  let pos;

  // X+: Right
  // Y+: Down
  if (dir.x < 0) { // Left
    anchorX = 1.03;
    anchorY = 0.7;
    // pivotX = -metrics.width * 0.5;
    // pivotY = -metrics.height * 0.5;
    angle = Vector2.signedAngle(Vector2.left, dir);
    pos = dir.rotate270()
      // .rescale(wellbore.wellboreWidth * 0.5 + 0.075)
      .rescale(wellbore.wellboreWidth * 0.5 + 0)
      .add(end)
      // .add(-0.5, -0.5);
  } else { // Right
    anchorX = -0.03;
    anchorY = 0.7;
    // pivotX = metrics.width * 0.5;
    // pivotY = -metrics.height * 0.5;
    angle = Vector2.signedAngle(Vector2.right, dir);
    pos = dir.rotate90()
      .rescale(wellbore.wellboreWidth * 0.5 + 0.075)
      .add(end);
  }

  // if (metrics.lines[0] === '(1998) P-14 AHT2') {
  //   console.log(pos)
  //   console.log(angle)
  // }
  text.position.set(pos[0], pos[1]);
  text.rotation = angle;
  text.anchor.set(anchorX, anchorY);
  text.scale.set(Label.state.scale); // Resize

  // Place background
  // background.position.set(pos[0], pos[1]);
  // background.pivot.set(pivotX, pivotY);
  // background.rotation = angle;
  // background.scale.set(Label.state.scale); // Resize
}
