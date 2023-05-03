/* eslint-disable curly, no-magic-numbers, @typescript-eslint/no-explicit-any */
import { Colors, getDefaultColors, InputColors } from '../Colors';
import { WellboreData, FilterStatus } from './WellboreData';
import { RootData } from './RootData';
import { SourceData } from './SourceData';
import { ResizeConfig } from '../../../ResizeConfigInterface';
import { ColorOffset } from '../Colors';


// const defaultColormap: ColorOffset[] = [
//   {
//       "offset": 0,
//       "color": "rgb(249, 249, 249)",
//       "label": "Blank"
//   },
//   {
//       "offset": 1,
//       "color": "rgb(0, 0, 0)",
//       "label": "Packet"
//   },
//   {
//       "offset": 2,
//       "color": "rgb(67, 254, 0)",
//       "label": "Zone control packer"
//   },
//   {
//       "offset": 3,
//       "color": "rgb(24, 8, 255)",
//       "label": "Openhole"
//   },
//   {
//       "offset": 4,
//       "color": "rgb(192, 17, 240)",
//       "label": "Perforation"
//   },
//   {
//       "offset": 5,
//       "color": "rgb(33, 97, 34)",
//       "label": "Screen only"
//   },
//   {
//       "offset": 6,
//       "color": "rgb(255, 217, 0)",
//       "label": "SICD 0.2 bar"
//   },
//   {
//       "offset": 7,
//       "color": "rgb(254, 143, 7)",
//       "label": "SICD 0.4 bar"
//   },
//   {
//       "offset": 8,
//       "color": "rgb(220, 84, 0)",
//       "label": "SICD 0.8 bar"
//   },
//   {
//       "offset": 9,
//       "color": "rgb(159, 0, 0)",
//       "label": "SICD 1.6 bar"
//   },
//   {
//       "offset": 10,
//       "color": "rgb(255, 0, 0)",
//       "label": "SICD 3.2 bar"
//   },
//   {
//       "offset": 11,
//       "color": "rgb(254, 12, 210)",
//       "label": "Nozzle"
//   },
//   {
//       "offset": 12,
//       "color": "rgb(0, 255, 226)",
//       "label": "RCP AR2"
//   },
//   {
//       "offset": 13,
//       "color": "rgb(0, 153, 255)",
//       "label": "RCP TR7"
//   },
//   {
//       "offset": 14,
//       "color": "rgb(159, 132, 255)",
//       "label": "Equiflow"
//   },
//   {
//       "offset": 15,
//       "color": "rgb(255, 255, 0)",
//       "label": "Slotted liner"
//   },
//   {
//       "offset": 16,
//       "color": "rgb(102, 0, 204)",
//       "label": "AICV"
//   },
//   {
//       "offset": 17,
//       "color": "rgb(33, 113, 181)",
//       "label": "RCP TR7 MK2.5"
//   },
//   {
//     "offset": 99,
//     "color": "rgb(249, 249, 249)",
//     "label": "RCP TR7 MK2.5"
//   },
// ]

const defaultColormap: ColorOffset[] = [
  {
      "offset": 0,
      "color": "rgb(245, 245, 245)",
      "label": "Sognefjord Fm. 6.2.1 / Nordland Gp. / Hordaland Green Clay"
  },
  {
      "offset": 1,
      "color": "rgb(0, 0, 0)",
      "label": "Draupne Fm."
  },
  {
      "offset": 2,
      "color": "rgb(15, 245, 252)",
      "label": "Sognefjord Fm. 6.2.2"
  },
  {
      "offset": 3,
      "color": "rgb(28, 71, 188)",
      "label": "Sognefjord Fm. 6.1.2"
  },
  {
      "offset": 4,
      "color": "rgb(245, 245, 245)",
      "label": "Sognefjord Fm. 6.1.1"
  },
  {
      "offset": 5,
      "color": "rgb(70, 70, 253)",
      "label": "Sognefjord Fm. 5.3.2"
  },
  {
      "offset": 6,
      "color": "rgb(245, 245, 245)",
      "label": "Sognefjord Fm. 5.3.1"
  },
  {
      "offset": 7,
      "color": "rgb(29, 29, 221)",
      "label": "Sognefjord Fm. 5.2.2"
  },
  {
      "offset": 8,
      "color": "rgb(245, 245, 245)",
      "label": "Sognefjord Fm. 5.2.1"
  },
  {
      "offset": 9,
      "color": "rgb(18, 18, 119)",
      "label": "Sognefjord Fm. 5.1.2"
  },
  {
      "offset": 10,
      "color": "rgb(245, 245, 245)",
      "label": "Sognefjord Fm. 5.1.1"
  },
  {
      "offset": 11,
      "color": "rgb(130, 140, 130)",
      "label": "Sognefjord Fm. 4.5"
  },
  {
      "offset": 12,
      "color": "rgb(62, 252, 62)",
      "label": "Sognefjord Fm. 4.4.2"
  },
  {
      "offset": 13,
      "color": "rgb(245, 245, 245)",
      "label": "Sognefjord Fm. 4.4.1"
  },
  {
      "offset": 14,
      "color": "rgb(89, 232, 91)",
      "label": "Sognefjord Fm. 4.3.2"
  },
  {
      "offset": 15,
      "color": "rgb(245, 245, 245)",
      "label": "Sognefjord Fm. 4.3.1"
  },
  {
      "offset": 16,
      "color": "rgb(10, 183, 10)",
      "label": "Sognefjord Fm. 4.2.2"
  },
  {
      "offset": 17,
      "color": "rgb(245, 245, 245)",
      "label": "Sognefjord Fm. 4.2.1"
  },
  {
    "offset": 18,
    "color": "rgb(29, 125, 29)",
    "label": "Sognefjord Fm. 4.1.2"
  },
  {
    "offset": 19,
    "color": "rgb(245, 245, 245)",
    "label": "Sognefjord Fm. 4.1.1"
  },
  {
    "offset": 20,
    "color": "rgb(82, 78, 75)",
    "label": "Sognefjord Fm. 3.6 / 3.5"
  },
  {
    "offset": 21,
    "color": "rgb(244, 143, 86)",
    "label": "Sognefjord Fm. 3.4.2"
  },
  {
    "offset": 22,
    "color": "rgb(245, 245, 245)",
    "label": "Sognefjord Fm. 3.4.1"
  },
  {
    "offset": 23,
    "color": "rgb(255, 109, 18)",
    "label": "Sognefjord Fm. 3.3.3"
  },
  {
    "offset": 24,
    "color": "rgb(255, 109, 18)",
    "label": "Sognefjord Fm. 3.3.2"
  },
  {
    "offset": 25,
    "color": "rgb(245, 245, 245)",
    "label": "Sognefjord Fm. 3.3.1"
  },
  {
    "offset": 26,
    "color": "rgb(255, 20, 20)",
    "label": "Sognefjord Fm. 3.2.2"
  },
  {
    "offset": 27,
    "color": "rgb(245, 245, 245)",
    "label": "Sognefjord Fm. 3.2.1"
  },
  {
    "offset": 28,
    "color": "rgb(255, 30, 170)",
    "label": "Sognefjord Fm. 3.1.2"
  },
  {
    "offset": 29,
    "color": "rgb(245, 245, 245)",
    "label": "Sognefjord Fm. 3.1.1"
  },
  {
    "offset": 30,
    "color": "rgb(149, 10, 10)",
    "label": "Sognefjord Fm. 2.2.2"
  },
  {
    "offset": 31,
    "color": "rgb(245, 245, 245)",
    "label": "Sognefjord Fm. 2.2.1"
  },
  {
    "offset": 32,
    "color": "rgb(94, 31, 31)",
    "label": "Sognefjord Fm. 2.1.2"
  },
  {
    "offset": 33,
    "color": "rgb(245, 245, 245)",
    "label": "Sognefjord Fm. 2.1.1"
  },
  {
    "offset": 34,
    "color": "rgb(0, 255, 0)",
    "label": "Fensfjord Fm. 6.3.2"
  },
  {
    "offset": 35,
    "color": "rgb(245, 245, 245)",
    "label": "Fensfjord Fm. 6.3.1"
  },
  {
    "offset": 36,
    "color": "rgb(255, 204, 0)",
    "label": "Fensfjord Fm. 6.2.2"
  },
  {
    "offset": 37,
    "color": "rgb(245, 245, 245)",
    "label": "Fensfjord Fm. 6.2.1"
  },
  {
    "offset": 38,
    "color": "rgb(255, 255, 0)",
    "label": "Fensfjord Fm. 6.1.2"
  },
  {
    "offset": 39,
    "color": "rgb(245, 245, 245)",
    "label": "Fensfjord Fm. 6.1.1"
  },
  {
    "offset": 40,
    "color": "rgb(0, 255, 0)",
    "label": "Fensfjord Fm. 5.2.2"
  },
  {
    "offset": 41,
    "color": "rgb(245, 245, 245)",
    "label": "Fensfjord Fm. 5.2.1"
  },
  {
    "offset": 42,
    "color": "rgb(29, 125, 29)",
    "label": "Fensfjord Fm. 5.1.2"
  },
  {
    "offset": 43,
    "color": "rgb(245, 245, 245)",
    "label": "Fensfjord Fm. 5.1.1"
  },
  {
    "offset": 44,
    "color": "rgb(255, 204, 0)",
    "label": "Fensfjord Fm. 4"
  },
  {
    "offset": 45,
    "color": "rgb(0, 255, 0)",
    "label": "Fensfjord Fm. 3"
  },
  {
    "offset": 46,
    "color": "rgb(255, 255, 0)",
    "label": "Fensfjord Fm. 2"
  },
  {
    "offset": 47,
    "color": "rgb(29, 125, 29)",
    "label": "Fensfjord Fm. 1"
  },
  {
    "offset": 48,
    "color": "rgb(79, 148, 205)",
    "label": "Krossfjord Fm."
  },
  {
    "offset": 49,
    "color": "rgb(230, 123, 155)",
    "label": "Heather A Unit"
  },
  {
    "offset": 50,
    "color": "rgb(255, 181, 197)",
    "label": "Heather C Unit"
  },
  {
    "offset": 99, // moved from 0 to 99
    "color": "rgb(245, 245, 245)",
    "label": "Sognefjord Fm. 6.2.1 / Nordland Gp. / Hordaland Green Clay"
  },
]

export interface GroupOptions {
  // colors?: InputColors | Function;
  colors?: InputColors;
  order?: number;
  wellboreResize?: ResizeConfig;
  wellboreWidth?: number;
  colorFunction?: Function;
  logColormap?: ColorOffset[];
}

interface WellboreState {
  completionVisible: boolean;
  wellboreVisible: boolean;
  labelsVisible: boolean;
  colorByLog: boolean;
  hidePathWithoutInterval: boolean;
  shadeWellbore: boolean;
}

type Filter = (data: SourceData) => boolean;

export class Group {
  key: string;
  colors: Colors;
  wellbores: WellboreData[] = [];
  active: boolean = true;
  order: number = 0;
  activeFilter: Filter = null;
  /** Is active filter soft or hard (Ghost) */
  isHardFilter: boolean;
  options: GroupOptions = {};
  wellboreWidth: number;
  colorFunction?: Function;
  logColormap: ColorOffset[] = defaultColormap;

  /** State of wellbores attached to group */
  state: WellboreState = {
    completionVisible: true,
    wellboreVisible: true,
    labelsVisible: false,
    colorByLog: false,
    hidePathWithoutInterval: false,
    shadeWellbore: true,
  };

  constructor(key: string, options?: GroupOptions) {
    this.key = key;
    if (options) {
      this.options = options;
      this.colors = getDefaultColors(options.colors);
      if(!isNaN(options.order)) this.order = options.order;
      if(options.wellboreWidth) this.wellboreWidth = options.wellboreWidth;
      if(options.colorFunction) this.colorFunction = options.colorFunction;
      if(options.logColormap) this.logColormap = options.logColormap;
    } else {
      this.colors = getDefaultColors();
    }
  }

  append(wellbore: WellboreData) {
    // zIndex only seems to affect drawing order, not hovering
    let zIndexExtra = 0;
    try {

      if (this.key === 'drilled' && (wellbore.data.branch).includes('T')) {
        // console.log(wellbore.data.branch)
        const index = (wellbore.data.branch).indexOf("T")
        // console.log((wellbore.data.branch).charAt(index+1))
        zIndexExtra = 10 * Number((wellbore.data.branch).charAt(index+1));
      }
    } catch (e) {}

    wellbore.zIndex = this.order * 10000 + this.wellbores.length + zIndexExtra;
    if (this.activeFilter) {
      const targetFilter = this.isHardFilter ? FilterStatus.hard : FilterStatus.soft;
      wellbore.setFilter(this.activeFilter(wellbore.data) ? FilterStatus.none : targetFilter);
      wellbore.root.recalculate(true);
    }
    this.wellbores.push(wellbore);
  }

  /**
   * Iterate over all wellbores and unique roots.
   * @param wellboreFunc Function to call on wellbores
   * @param rootFunc Function to call on roots
   */
  private forAll(wellboreFunc: (wellbore: WellboreData) => void, rootFunc: (root: RootData) => void) {
    const roots = new Set<RootData>(); // Set of unique roots

    const wellbores = this.wellbores;
    for (let i = 0; i < wellbores.length; i++) {
      const wellbore = wellbores[i];
      wellboreFunc(wellbore);
      roots.add(wellbore.root);
    }

    roots.forEach(root => rootFunc(root));
  }

  setActive(active: boolean) : void {
    if (this.active === active) return;
    this.active = active;

    this.forAll(
      wellbore => wellbore.update(!wellbore.label.visible),
      root => root.recalculate(true),
    );
  }

  softFilter(filter: Filter) {
    this.activeFilter = filter;
    this.isHardFilter = false;
    this.forAll(
      wellbore => wellbore.setFilter(filter(wellbore.data) ? FilterStatus.none : FilterStatus.soft),
      root => root.recalculate(true),
    );
  }

  hardFilter(filter: Filter) {
    this.activeFilter = filter;
    this.isHardFilter = true;
    this.forAll(
      wellbore => wellbore.setFilter(filter(wellbore.data) ? FilterStatus.none : FilterStatus.hard),
      root => root.recalculate(true),
    );
  }

  clearFilter() {
    this.activeFilter = null;
    this.forAll(
      wellbore => wellbore.setFilter(FilterStatus.none),
      // root => root.recalculate(true),
      // TODO: Improve... just a test to hide labels after changing filter
      root => root.recalculate(this.wellbores[0].label.visible),
    );
  }

  setCompletionVisibility(visible: boolean) {
    this.state.completionVisible = visible;
    this.wellbores.forEach(wellbore => {
      if (wellbore.mesh) wellbore.uniforms.completionVisible = visible;
    });
  }

  setColorByLog(colorByLog: boolean) {
    this.state.colorByLog = colorByLog;
    this.wellbores.forEach(wellbore => {
      if (wellbore.mesh) wellbore.uniforms.colorByLog = colorByLog;
    });
  }

  setHidePathWithoutInterval(hidePathWithoutInterval: boolean) {
    this.state.hidePathWithoutInterval = hidePathWithoutInterval;
    this.wellbores.forEach(wellbore => {
      if (wellbore.mesh) wellbore.uniforms.hidePathWithoutInterval = hidePathWithoutInterval;
    });
  }

  setShadeWellbore(shadeWellbore: boolean) {
    this.state.shadeWellbore = shadeWellbore;
    this.wellbores.forEach(wellbore => {
      if (wellbore.mesh) wellbore.uniforms.shadeWellbore = shadeWellbore;
    });
  }

  setWellboreVisibility(visible: boolean) {
    this.state.wellboreVisible = visible;
    this.wellbores.forEach(wellbore => {
      if (wellbore.mesh) wellbore.uniforms.wellboreVisible = visible;
    });
  }
}
