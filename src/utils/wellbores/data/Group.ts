import { Colors, getDefaultColors, InputColors } from '../Colors';
import { WellboreData, FilterStatus } from './WellboreData';
import { RootData } from './RootData';
import { SourceData } from './SourceData';
import { ResizeConfig } from '../../../ResizeConfigInterface';
import { ColorOffset } from '../Colors';


const defaultColormap: ColorOffset[] = [
  {
      "offset": 0,
      "color": "rgb(249, 249, 249)",
      "label": "Blank"
  },
  {
      "offset": 1,
      "color": "rgb(0, 0, 0)",
      "label": "Packet"
  },
  {
      "offset": 2,
      "color": "rgb(67, 254, 0)",
      "label": "Zone control packer"
  },
  {
      "offset": 3,
      "color": "rgb(24, 8, 255)",
      "label": "Openhole"
  },
  {
      "offset": 4,
      "color": "rgb(192, 17, 240)",
      "label": "Perforation"
  },
  {
      "offset": 5,
      "color": "rgb(33, 97, 34)",
      "label": "Screen only"
  },
  {
      "offset": 6,
      "color": "rgb(255, 217, 0)",
      "label": "SICD 0.2 bar"
  },
  {
      "offset": 7,
      "color": "rgb(254, 143, 7)",
      "label": "SICD 0.4 bar"
  },
  {
      "offset": 8,
      "color": "rgb(220, 84, 0)",
      "label": "SICD 0.8 bar"
  },
  {
      "offset": 9,
      "color": "rgb(159, 0, 0)",
      "label": "SICD 1.6 bar"
  },
  {
      "offset": 10,
      "color": "rgb(255, 0, 0)",
      "label": "SICD 3.2 bar"
  },
  {
      "offset": 11,
      "color": "rgb(254, 12, 210)",
      "label": "Nozzle"
  },
  {
      "offset": 12,
      "color": "rgb(0, 255, 226)",
      "label": "RCP AR2"
  },
  {
      "offset": 13,
      "color": "rgb(0, 153, 255)",
      "label": "RCP TR7"
  },
  {
      "offset": 14,
      "color": "rgb(159, 132, 255)",
      "label": "Equiflow"
  },
  {
      "offset": 15,
      "color": "rgb(255, 255, 0)",
      "label": "Slotted liner"
  },
  {
      "offset": 16,
      "color": "rgb(102, 0, 204)",
      "label": "AICV"
  },
  {
      "offset": 17,
      "color": "rgb(33, 113, 181)",
      "label": "RCP TR7 MK2.5"
  },
  {
    "offset": 99,
    "color": "rgb(249, 249, 249)",
    "label": "RCP TR7 MK2.5"
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
  hideNormalPath: boolean;
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
    hideNormalPath: false,
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
    wellbore.zIndex = this.order * 10000 + this.wellbores.length;
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

  setHideNormalPath(hideNormalPath: boolean) {
    this.state.hideNormalPath = hideNormalPath;
    this.wellbores.forEach(wellbore => {
      if (wellbore.mesh) wellbore.uniforms.hideNormalPath = hideNormalPath;
    });
  }

  setWellboreVisibility(visible: boolean) {
    this.state.wellboreVisible = visible;
    this.wellbores.forEach(wellbore => {
      if (wellbore.mesh) wellbore.uniforms.wellboreVisible = visible;
    });
  }
}
