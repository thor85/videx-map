import { round } from '@equinor/videx-math';
import Vector2 from '@equinor/videx-vector2';
import { SegmentPoint, LineInterpolator } from './LineInterpolator';
import Mesh from './Mesh';
import { TickConfig } from './wellbores/Config';
import { WellboreData } from './wellbores/data/WellboreData';

interface meshData {
  vertices: number[];
  triangles: number[];
  vertexData: number[];
  extraData: number[];
  logData: number[]
}

export class WellboreMesh {

  /** Parent wellboreData */
  wellboreData: WellboreData;

  /** Line interpolator used to construct mesh. */
  interp: LineInterpolator;

  /** Thickness of line. */
  thickness: number;

  /** Index of latest vertex, i.e. base for triangulation of new geometry. */
  baseTris: number;

  /** Width and height of tick. */
  tick: TickConfig;

  /**
   * Constructor for creating a new line interpolator.
   * @param interp Interpolator used to generate line
   */
  constructor(interp: LineInterpolator, thickness: number, tick: TickConfig, wellboreData?: WellboreData) {
    if (wellboreData) this.wellboreData = wellboreData;
    this.interp = interp;
    this.thickness = thickness;
    this.baseTris = 0;
    this.tick = tick;
  }

  /**
   * Generate mesh. Interval positioning should be relative.
   * @param screens Collection of intervals on the format: [ [Start0, End0], ..., [StartN, EndN] ]
   */
  generate(screens: [number, number, number, number][] = [], packers: [number, number][] = []): meshData {
    // Vertices and triangulation
    const vertices: number[] = [];
    const triangles: number[] = [];
    const vertexData: number[] = [];
    const extraData: number[] = []; // 0: Normal, 1: Screen, 2: Packer, 3: Blank, 4 = Normal with log
    const logData: number[] = [];

    let j: number = 0;
    if(screens.length <= 0) {
      const path: SegmentPoint[] = this.interp.GetSection(0, 1);
      // console.log(path)
      // console.log(this)
      let logvalue = -999;
      try {
        logvalue = screens[0][2];
      } catch (e) {};
      this.appendSegment(path, 0, vertices, triangles, vertexData, extraData, logData, logvalue);
    } else if (screens.length > 0) { // If there are intervals
      let p: number = 0;
      screens.forEach(i => {
        let logvalue = -999;
        try {
          logvalue = i[2];
        } catch (e) {};
        const diff = i[0] - p;
        const path1: SegmentPoint[] = this.interp.GetSection(p, i[0]);
        const path2: SegmentPoint[] = this.interp.GetSection(i[0], i[1]);

        let type = 0;
        if (i[3]) type = i[3];
        if (type === 2) type = 5; // temp fix. type 2 is crosslines, type 5 is log values of packers

        // do not create tiny normal segments
        let logvalueBetweenIntervals = -999;
        let typeBetweenIntervals = 0;
        if (diff < 0.01) {
          logvalueBetweenIntervals = logvalue;
          typeBetweenIntervals = type;
        }

        this.appendSegment(path1, typeBetweenIntervals, vertices, triangles, vertexData, extraData, logData, logvalueBetweenIntervals);
        this.appendSegment(path2, type, vertices, triangles, vertexData, extraData, logData, logvalue);

        p = i[1];
      })
      // Add last path
      const end = screens[screens.length - 1][1];
      if (end < 1) {
        let logvalue = -999;
        const lastPath: SegmentPoint[] = this.interp.GetSection(end, 1);
        this.appendSegment(lastPath, 0, vertices, triangles, vertexData, extraData, logData, logvalue);
      }
    }

    // create cross-lines
    packers.forEach(i => {
      const p1: SegmentPoint = this.interp.GetPoint((i[0] + i[1]) / 2);
      this.generateCrossline(p1, vertices, triangles, vertexData, extraData, logData);
    });

    return { vertices, triangles, vertexData, extraData, logData };
  }

  /**
   * Append line segment from a section of points.
   * @param section Collection of segment points
   * @param type Type of segment, applied as vertex color
   * @param vertices 1-dimensional array with vertices
   * @param triangles 1-dimensional array with triangulation
   * @param vertexData 1-dimensional array with vertex data
   * @param extraData 1-dimensional array with type-data
   * @private
   */
  appendSegment(section: SegmentPoint[], type: number, vertices: number[], triangles: number[], vertexData: number[], extraData: number[], logData: number[], log: number) : void {
     // Make line mesh and use callback to add extra attributes
     const mesh = Mesh.WellboreSegment(section, this.thickness, type, log);

    vertices.push(...mesh.vertices);
    mesh.triangles.forEach(d => triangles.push(d + this.baseTris));
    vertexData.push(...mesh.vertexData);
    extraData.push(...mesh.extraData);
    logData.push(...mesh.logData);
    this.baseTris += mesh.vertices.length / 2;
  }

  /**
   * Creates a tick at the given position.
   * @param p Position of tick
   * @param baseTris Base triangle index
   * @param vertices 1-dimensional array with vertices
   * @param triangles 1-dimensional array with triangulation
   * @param vertexData 1-dimensional array with vertex data
   * @param extraData 1-dimensional array with type-data
   * @private
   */
  private generateCrossline(p: SegmentPoint, vertices: number[], triangles: number[], vertexData: number[], extraData: number[], logData: number[]): void {
    const px = p.position[0];
    const py = p.position[1];

    // 2    3
    //
    // 0    1

    const crosslinesWidth = this.tick.width;
    // const crosslinesWidth = 0.01;
    // const crosslinesWidth = 0.2;
    const dirX = p.direction[0] * crosslinesWidth;
    const dirY = p.direction[1] * crosslinesWidth;

    const crosslinesHeight = this.tick.height;
    // const crosslinesHeight = 0.1;
    // const crosslinesHeight = 0.5;
    const normX = -p.direction[1] * crosslinesHeight;
    const normY = p.direction[0] * crosslinesHeight;

    // console.log(crosslinesWidth)
    // console.log(crosslinesHeight)
    // console.log(" ")

    vertices.push(
      px - dirX - normX, // Lower left:  X
      py - dirY - normY, // Lower left:  Y
      px + dirX - normX, // Lower right: X
      py + dirY - normY, // Lower right: Y
      px - dirX + normX, // Upper left:  X
      py - dirY + normY, // Upper left:  Y
      px + dirX + normX, // Upper right: X
      py + dirY + normY, // Upper right: Y
    );

    triangles.push(this.baseTris, this.baseTris + 2, this.baseTris + 3, this.baseTris, this.baseTris + 3, this.baseTris + 1);

    extraData.push(2, 2, 2, 2); // Push tick type
    logData.push(0, 0, 0, 0); // TODO: Add log data

    // Get normalized normal
    const normalizedNormal = new Vector2(normX, normY).normalized();
    const nnx = normalizedNormal.x;
    const nny = normalizedNormal.y;

    // Real distance [0, N], Upper/Lower [0, 1], Normal.x, Normal.y
    vertexData.push(
      p.distance, 0.0, -nnx, -nny,
      p.distance, 0.0, -nnx, -nny,
      p.distance, 1.0, nnx, nny,
      p.distance, 1.0, nnx, nny,
    ); // Add vertex data

    this.baseTris += 4;
  }
}
