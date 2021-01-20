import Vector2 from '@equinor/videx-vector2';
import { slider } from '@equinor/videx-storybook-input';
import { reduce } from '../../../src/utils/lineReducer';

import * as d3 from 'd3';

export default { title: 'utils/lineReducer' };

export const Quick = () => {
  const width = 500;
  const height = 500;

  const root = d3.create('div');

  let draw: (data: Vector2[]) => void = () => {};

  let maxDeviation: number = 0.00001;
  let distWeight: number = 0;

  slider(root, {
    header: 'Max Deviation',
    min: 0,
    max: 0.001,
    step: 0.00001,
    value: 0.00001,
    dualInput: true,
  },
    d => {
      maxDeviation = d;
      draw(reduce(data, maxDeviation, distWeight));
    },
  );

  slider(root, {
    header: 'Distance weight',
    min: -1,
    max: 0.1,
    step: .01,
    value: 0,
    dualInput: true,
  },
  d => {
    distWeight = d;
    draw(reduce(data, maxDeviation, distWeight));
    },
  );

  const reduced = reduce(data, maxDeviation, distWeight);

  root.append('div')
    .style('height', '25px')
    .text(`Initial: ${data.length}`);

  const output = root.append('div')
    .style('height', '25px')
    .text(`Points: ${reduced.length}`);

  const svg = root.append('svg')
    .style('width', `${width}px`)
    .style('height', `${height}px`)
    .style('border', '2px dotted DimGrey')

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  reduced.forEach(d => {
    if (d.x < minX) minX = d.x;
    if (d.y < minY) minY = d.y;
    if (d.x > maxX) maxX = d.x;
    if (d.y > maxY) maxY = d.y;
  });

  const xRange = maxX - minX;
  const yRange = maxY - minY;

  draw = (inputData: Vector2[]) => {
    const circles = svg.selectAll('circle').data(inputData)
    circles.exit().remove(); // Remove unused
    circles // Update current
      .attr('cx', d => (width - 50) * (d.x - minX) / xRange + 25)
      .attr('cy', d => (height - 50) * (d.y - minY) / yRange + 25)
      .attr('fill', (_, i) => d3.interpolateRainbow(i / inputData.length));
    circles.enter() // Add missing
      .append('circle')
      .attr('cx', d => (width - 50) * (d.x - minX) / xRange + 25)
      .attr('cy', d => (height - 50) * (d.y - minY) / yRange + 25)
      .attr('r', 2)
      .attr('fill', (_, i) => d3.interpolateRainbow(i / inputData.length));

      output.text(`Points: ${inputData.length}`);
  }

  draw(reduced);

  return root.node();
};

const data: Vector2[] = [
  [3.4367499974301623, 60.86898037484667],
  [3.436748235842518, 60.86898621640885],
  [3.436785246806324, 60.86898618602434],
  [3.436828483788195, 60.868983621510836],
  [3.4368935829390965, 60.86897739469481],
  [3.4372314148932936, 60.86893275271583],
  [3.437553744801757, 60.868885646407804],
  [3.438448465023187, 60.868738273647864],
  [3.4388390311491204, 60.86867235691149],
  [3.439105551107254, 60.8686243515381],
  [3.439974719225965, 60.86845433709043],
  [3.4410048301864036, 60.86825909935776],
  [3.4413692185832034, 60.86819173476462],
  [3.442172841759794, 60.8680504718452],
  [3.4425809544399995, 60.86797631633937],
  [3.4430029228452175, 60.86790561546882],
  [3.4438541194792704, 60.86777029098142],
  [3.4442956402610716, 60.867702484339944],
  [3.4447380510523353, 60.86763260830973],
  [3.445605498320151, 60.86748851009261],
  [3.446031340093747, 60.867419223372686],
  [3.446459415755324, 60.86735181331349],
  [3.4469064763415256, 60.867285954896346],
  [3.447790586191785, 60.86716288601697],
  [3.4490857145893115, 60.86697837538793],
  [3.4499964865511292, 60.866853945998784],
  [3.450411966200838, 60.86679536412269],
  [3.4508387442795434, 60.86672857290135],
  [3.453059214028834, 60.86637347533044],
  [3.4534666173143944, 60.86630449643786],
  [3.453925636396249, 60.8662140637208],
  [3.454318916276577, 60.86612322300243],
  [3.4547857864034044, 60.8660025939482],
  [3.455207968005576, 60.86588588536035],
  [3.4554094699002795, 60.86582657542475],
  [3.455623200207999, 60.86575977182935],
  [3.4558188946543633, 60.86569356770447],
  [3.4559961941054254, 60.8656285928231],
  [3.4562228587764414, 60.865539388609086],
  [3.456404772964813, 60.86546245647654],
  [3.456582403122878, 60.86538212690645],
  [3.45675556383816, 60.86529831076285],
  [3.456923145324603, 60.86521065270312],
  [3.457084971160165, 60.86511969204173],
  [3.4572430844632493, 60.865026678807496],
  [3.457408247245172, 60.86492457339127],
  [3.4575780518250285, 60.864812396350345],
  [3.4577111151813487, 60.86471883929095],
  [3.4578510464320518, 60.86461637026281],
  [3.457987086226828, 60.864512208469925],
  [3.4581075523975398, 60.86441339673828],
  [3.4582395507568844, 60.8642971278232],
  [3.458357087889058, 60.86418674390989],
  [3.4584774295405163, 60.86406656404884],
  [3.458582576347891, 60.863952451302296],
  [3.4586812570965, 60.863836834218844],
  [3.4587747656733123, 60.8637200675292],
  [3.458867026039251, 60.86359333918138],
  [3.4589295641029754, 60.86349948276192],
  [3.4594506337833977, 60.8626571608391],
  [3.4598661719935695, 60.8620057159268],
  [3.4602694559013543, 60.8613993823541],
  [3.4606753485117268, 60.86082185871659],
  [3.4608631998313664, 60.86055905037312],
  [3.4610426487206807, 60.86031377813448],
  [3.4613726590245997, 60.85983751762278],
  [3.4615292217872033, 60.85958864211474],
  [3.4622362224019647, 60.85836131152967],
  [3.462510214514949, 60.857858036417284],
  [3.462890425442742, 60.85712706578874],
  [3.463019198212786, 60.856892918586134],
  [3.4631717733234284, 60.856624751476424],
  [3.4635874968000584, 60.85590775222027],
  [3.463682806785015, 60.8557529976553],
  [3.464087784432352, 60.85514691521877],
  [3.4644015509602717, 60.85468686359269],
  [3.464581819019507, 60.85441339171813],
  [3.464686712152235, 60.85426012958213],
  [3.4650750920460567, 60.85371766737113],
  [3.4652553946057534, 60.853472655489426],
  [3.465419595807141, 60.853234342989815],
  [3.4659730248467637, 60.85238766192515],
  [3.466537352451611, 60.85153312950666],
  [3.4666011819895868, 60.85143001715089],
  [3.4667453552384497, 60.85117004500807],
  [3.466992802654715, 60.85067277769758],
  [3.467122859461902, 60.85042955370075],
  [3.4675668661478456, 60.84966979606049],
  [3.4677069611941027, 60.84944664785258],
  [3.4678822830949976, 60.84919123472215],
  [3.4680642620820366, 60.84893822230587],
  [3.4682200266923884, 60.848730012683326],
  [3.4687916696401495, 60.84793110983396],
].map(d => new Vector2(d[0], d[1]));