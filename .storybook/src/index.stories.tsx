import * as d3 from 'd3';
import * as L from 'leaflet';
import { FaultlineModule, OutlineModule, WellboreModule, GeoJSONModule, FieldModule } from '../../src';
import { RootData } from '../../src/utils/wellbores/data';
import processExploration from './processExploration';
import removeExpDuplicates from './removeExpDuplicates';

import { SourceData } from '../../src/utils/wellbores/data/SourceData';
import PixiLayer from './helper/PixiLayer';
import { ProspectColors } from './helper/ProspectColors';
import Sidebar from './Sidebar';

import Vector2 from '@equinor/videx-vector2';
import { omit } from 'lodash';

export default { title: 'Leaflet layer' };

const factors: any = {
  10: 0.3,
  11: 0.1,
  12: 0.06,
  13: 0.04,
  14: 0.03,
  15: 0.02,
  16: 0.01,
  17: 0.01,
  18: 0.005,
  19: 0.005,
  20: 0.0025,
};

const initialZoom: number = 11;

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Sample data
const faultlineDataTroll = require('./Samples/Troll-Faultlines.json');
const outlineDataTroll = require('./Samples/Troll-Outlines.json');
const wellboreDataTroll = require('./Samples/Troll-Wellbores.json');
// console.log(wellboreDataTroll)
const wbDataOld = Object.values(wellboreDataTroll) as any[];
const licenseData = require('./.Samples/licenses.json');
const pipelineData = require('./.Samples/pipelines.json');
const facilityData = require('./.Samples/facilities.json');
// const prospectData = require('./Samples/Prospects100.json');
const prospectData = require('./Samples/prospects.json');
// const fieldData = require('./Samples/Fields.json');
const fieldData = require('./Samples/discoveries.json');
console.log(fieldData)

let explorationData = processExploration(
  require('./Samples/Exploration.json'),
);

explorationData = removeExpDuplicates(explorationData, wbDataOld);
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

export const layer = () => {
  const root = d3.create('div')
    .style('width', '100%')
    .style('height', '1400px');

  const mapRoot = root.append('div')
    .style('position', 'absolute')
    .style('width', '88%')
    .style('height', '1400px');

  mapRoot.append('link')
    .attr('rel', 'stylesheet')
    .attr('href', 'https://unpkg.com/leaflet@1.5.1/dist/leaflet.css');

  const sidebarRoot = root.append('div')
      .style('position', 'absolute')
      .style('left', '88%')
      .style('width', '12%')
      .style('height', '1400px')

  const sidebar = new Sidebar(sidebarRoot, { marginPct: 7 });

  /** Remove two char code at start, if found. Eg, 'NO 31/2-3' becomes '31/2-3'. */
  function stripLabel(name: string) {
    let output = name;
    if (/^[a-zA-Z]{2}\s/.test(name)) {
      output = name.substring(3);
    }
    return output;
  }

    /** Extract year from date string. */
  function getYear(date: any) {
    if (!date) return null;
    return new Date(date).getFullYear();
  }

  function transformDrilledWellboreData(data: any[]) {
    // const proj = new GeoProjection(defaultCrs);

    const wellboreInfo: any[] = data.map(item => {
      const depthRef: any = item.depthReferenceElevation;

      //@ts-ignore
      item.intervals = item.intervals.map(d => ({
        ...d,
        start: d.start + depthRef,
        end: d.end + depthRef,
      }));
      // proj.set(item.projectedCoordinateSystem || defaultCrs);
      // item.path = proj.toLatLongStream(item.path, [item.refX, item.refY]);
      return {
        ...omit(item, ['depthMsl']),
        wellboreId: item.wellboreGuid,
        label: item.uniqueWellboreIdentifier,
        labelShort: stripLabel(item.uniqueWellboreIdentifier),
        category: item.wellborePurpose?.toLowerCase() || 'unknown',
        drillEndYear: getYear(item.drillEndDate || item.completionDate),
        totalDepthDrillerMd: item.depthMsl + depthRef,
      };
    });

    return wellboreInfo;
  }

  /** Get displacement of point relative to line. X-axis follows line and starts at 'lineStart'. */
  function displacementToVectorOrigin(point: any, lineStart: any, lineEnd: any) {
    const lineDir = Vector2.sub(lineEnd, lineStart);

    // Angle of line relative to x-axis
    const lineAngle = Math.atan2(lineDir.y, lineDir.x);

    // Local direction to point
    const dir = Vector2.sub(point, lineStart).rotate(-lineAngle);

    return new Vector2(Math.abs(dir.x), Math.abs(dir.y));
  }

  function ReduceLine(points: any[], maxDeviation: any, distanceWeight: any) {
    const output = [
      points[0],
      points[1],
    ];

    // Initial direction
    let [lineStart, lineEnd] = points;

    for (let i = 2; i < points.length - 1; i++) {
      const cur = points[i];

      const minDisp = displacementToVectorOrigin(cur, lineStart, lineEnd);
      if (minDisp.y > maxDeviation + minDisp.x * distanceWeight) {
        output.push(cur);
        lineStart = [...lineEnd];
        lineEnd = [...cur];
      }
    }

    output.push(points[points.length - 1]); // Add last

    return output;
  }

  function parseGeometryType(geometryString: string) {
    const geometryType = geometryString.substr(0, geometryString.indexOf(' '));
    const lowercase = geometryType.toLowerCase();
    if (lowercase === 'polygon') return { success: true, geometryType: 'Polygon' };
    if (lowercase === 'multipolygon') return { success: true, geometryType: 'MultiPolygon' };
    return { success: false };
  }

  const filteredProspectIds = [
    12990,
  ]

  function transformProspectData(data: any[]) {
    const features: any[] = [];
    // console.log(data)
    data.forEach(d => {
      // Skip if missing geometry data
      if (!('polygonGeometryWkt' in d)) return;

      const geometryString = d.polygonGeometryWkt;

      const properties = { ...d };
      delete properties.polygonGeometryWkt;

      const { success, geometryType } = parseGeometryType(geometryString);
      if (!success) return; // Return if non-valid geometry

      // ! (Hopefully) Temporary code to parse prospect coordinates.
      // ! Support for Polygon and MultiPolygon with holes.
      let index = 0;
      const getCoordinatesRecursive = (arr: any[]) => {
        let char: any;
        let sequence = '';
        while (index < geometryString.length) {
          char = geometryString[index++];
          if (char === '(') {
            sequence = '';
            const sub: any[] = [];
            arr.push(sub);
            getCoordinatesRecursive(sub);
          } else if (char === ')') {
            if (sequence !== '') {
              arr.push(
                ...sequence.split(',').map((pair) => {
                  const [lat, long] = pair.split(/\s/);
                  return [Number(lat), Number(long)];
                }),
              );
            }
            return;
          } else {
            sequence += char;
          }
        }
      };

      let coordinates: any[] = [];
      getCoordinatesRecursive(coordinates);
      ([coordinates] = coordinates);

      if (filteredProspectIds.indexOf(d.prospectId) && d.latitude > 60 && d.longitude > 2.5) {
        features.push({
          type: 'Feature',
          properties,
          geometry: {
            type: geometryType,
            coordinates,
          },
        });
      }
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  requestAnimationFrame(() => {
    const map = L.map(mapRoot.node()).setView([60.78, 3.57], initialZoom);
    // const map = L.map(root.node()).setView([72.395, 20.13], initialZoom); // JC
    // const map = L.map(root.node()).setView([59.227, 2.507], initialZoom); // Grand
    // const map = L.map(root.node()).setView([59.186, 2.491], initialZoom); // Grane
    L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}.png', {
      maxNativeZoom: 10,
      noWrap: true,
    }).addTo(map);

    const pixiLayer = new PixiLayer();
    const faultlines: FaultlineModule = new FaultlineModule();
    const fields: FieldModule = new FieldModule({
      // onFeatureHover: (event, data) => {
      //   if (data && data.length > 0) {
      //     console.log(data)
      //   }
      // },
      outlineResize: {
        min: { zoom: 6, scale: 1.5 },
        max: { zoom: 18, scale: 0.55 },
      },
      labelResize: {
        min: { zoom: 9, scale: 0.81 },
        max: { zoom: 18, scale: 0.1525 },
        // threshold: 8,
        baseScale: 0.15,
      },
      initialHash: 5,
    });
    const outlines: OutlineModule = new OutlineModule({
      minExtraWidth: 0.0,
      maxExtraWidth: 0.3,
    });
    const wellbores: WellboreModule = new WellboreModule(
      {
        scale: 1.5,
        // labelScale: 1,
        labelBgOpacity: 0.2,
        zoomOrigin: 0,
        wellboreDash: 0.08,
        // @ts-ignore
        scaling: zoom => factors[zoom] || 0,
        wellboreResize: {
          min: { zoom: 10, scale: 0.5 },
          max: { zoom: 18, scale: 0.05 },
        },
        rootResize: {
          min: { zoom: 0, scale: 1000.0 },
          max: { zoom: 18, scale: 0.2 },
        },
        tick: {
          width: 0.01,
          height: 0.1,
        },
        fontSize: 64,
        // labelScale: 0.011,
        // wellboreWidth: 150,
        onHighlightOn: event => {
          const latLng = map.mouseEventToLatLng(event.originalEvent);
          // console.log(latLng)
          // console.log(event.eventData[0].data.labelShort)
          // console.log(event)
          if (event.count === 1) mapRoot.node().style.cursor = 'pointer'; // Set cursor style
          else mapRoot.node().style.cursor = null; // Remove cursor style
        },
        // onHighlightOff: () => {
        //   mapRoot.node().style.cursor = null; // Remove cursor style
        // },
        // onWellboreClick: wellbore => {
        //   wellbores.setSelected(d => d === wellbore.data);
        // }
      },
    );

    const licenses: GeoJSONModule = new GeoJSONModule({
      outlineResize: {
        min: { zoom: 6, scale: 6.0 },
        max: { zoom: 18, scale: 5.05 },
      },
      labelResize: {
        min: { zoom: 11, scale: 0.1 },
        max: { zoom: 17, scale: 0.025 },
        // threshold: 8,
        baseScale: 0.15,
      },
      onFeatureHover: (event, data) => {
        if (data && data.length > 0) {
          // console.log(data)
        }
      },
    });
    // (window as any).licenses = licenses;
    // console.log(licenses)
    const pipelines: GeoJSONModule = new GeoJSONModule({
      onFeatureHover: (event, data) => {
        if (data && data.length > 0) {
          // console.log(data)
        }
      },
    });
    const facilities: GeoJSONModule = new GeoJSONModule({
      onFeatureHover: (event, data) => {
        if (data && data.length > 0) {
          // console.log(data)
        }
      },
      distanceThreshold: 5
    });
    const prospects: GeoJSONModule = new GeoJSONModule({
      outlineResize: {
        min: { zoom: 6, scale: 1.5 },
        max: { zoom: 18, scale: 0.15 },
      },
      labelResize: {
        min: { zoom: 11, scale: 0.1 },
        max: { zoom: 17, scale: 0.025 },
        threshold: 8,
        baseScale: 0.15,
      },
      // onFeatureHover: (event, data) => {
      //   if (data && data.length > 0) {
      //     console.log(data)
      //   }
      // },
    });

    pixiLayer.addModule(faultlines);
    pixiLayer.addModule(fields);
    pixiLayer.addModule(outlines);
    pixiLayer.addModule(wellbores);
    pixiLayer.addModule(licenses);
    pixiLayer.addModule(pipelines);
    pixiLayer.addModule(facilities);
    pixiLayer.addModule(prospects);
    pixiLayer.addTo(map);

    fields.set(fieldData.features);
    // fields.highlight(60.9, 3.6)
    // fields.clear();
    faultlines.set(faultlineDataTroll);
    outlines.set(outlineDataTroll);

    // console.log(wbDataOld)
    // const wbData = transformDrilledWellboreData(wbDataOld) as any[];
    const wbData = wbDataOld;
    // console.log(wbData)

    const split = Math.floor(wbData.length * 0.9);

    const drilled = wbData.slice(0, split);
    const planned = wbData.slice(split + 1, wbData.length);

    wellbores.registerGroup('Drilled', {
      order: 0,
      // colors: {
      //   defaultColor1: [0.3, 0.3, 0.3],
      //   defaultColor2: [0.05, 0.05, 0.05],
      // },
      // @ts-ignore
      colorFunction: function (data: SourceData) {
        let color;
        switch (data.status) {
          case 'top producer':
          case 'producer':
            color = {
              col1: [0.0, 1.0, 0.0],
              col2: [0.0, 0.5, 0.0],
              labelBg: 16777215,
            }
            break;
          case 'p&a':
            color = {
              col1: [1.0, 0.0, 0.0],
              col2: [0.5, 0.0, 0.0],
              labelBg: 16777215,
            }
            break;
          case 'good on/off':
            color = {
              col1: [1.0, 1.0, 0.0],
              col2: [0.5, 0.5, 0.0],
              labelBg: 16777215,
            }
            break;
          case 'bad on/off':
            color = {
              col1: [1.0, 0.5, 0.0],
              col2: [0.5, 0.25, 0.0],
              labelBg: 16777215,
            }
            break;
          default:
            color = {
              col1: [0.3, 0.3, 0.3],
              col2: [0.05, 0.05, 0.05],
              labelBg: 16777215,
            }
            break;
        }

        return color;
      },
    });

    wellbores.registerGroup('Planned', {
      order: 1,
      colors: {
        defaultColor1: [0.4, 0.7, 1.0],
        defaultColor2: [0.1, 0.3, 0.6],
      },
      // wellboreResize: {
      //   min: { zoom: 10, scale: 3.5 },
      //   max: { zoom: 18, scale: 2.5 },
      // },
      wellboreWidth: 0.3,
    });

    wellbores.registerGroup('Exploration', {
      order: 2,
      colors: {
        defaultColor1: [0.7, 1.0, 0.4],
        defaultColor2: [0.3, 0.6, 0.1],
      },
    });

    wellbores.set(drilled, 'Drilled'); // Set first half (Emulate 'Drilled')

    wellbores.set(planned, 'Planned'); // Set second half (Emulate 'Planned')
    // wellbores.set(explorationData, 'Exploration');


    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Buttons

    const groupShowHide = sidebar.addGroup('Show/Hide');

    const toggle = (key: string) => {
      if (wellbores.groups[key].active) wellbores.disable(key);
      else wellbores.enable(key);
    }

    groupShowHide.add('Disable wellbores', () => wellbores.disable());
    groupShowHide.add('Enable wellbores', () => wellbores.enable());
    groupShowHide.add('Toggle \'Drilled\'', () => toggle('Drilled'));
    groupShowHide.add('Toggle \'Planned\'', () => toggle('Planned'));

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    let labelActive = true;

    const groupShowHideLabel = sidebar.addGroup('Show/Hide labels');

    groupShowHideLabel.add('Toggle labels', () => {
      labelActive = !labelActive;
      wellbores.setLabelVisibility(labelActive);
    });

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    let completionDrilledVisible = true;
    let completionPlannedVisible = true;

    const groupShowHideCompletion = sidebar.addGroup('Show/Hide completion');

    groupShowHideCompletion.add('Toggle completion', () => {
      const completionVisible = !(completionDrilledVisible && completionPlannedVisible);
      completionDrilledVisible = completionVisible;
      completionPlannedVisible = completionVisible;
      wellbores.setCompletionVisibility(completionDrilledVisible);
    });

    groupShowHideCompletion.add('Toggle \'Drilled\'', () => {
      completionDrilledVisible = !completionDrilledVisible;
      wellbores.setCompletionVisibility(completionDrilledVisible, 'Drilled');
    });
    groupShowHideCompletion.add('Toggle \'Planned\'', () => {
      completionPlannedVisible = !completionPlannedVisible;
      wellbores.setCompletionVisibility(completionPlannedVisible, 'Planned');
    });
    groupShowHideCompletion.add('Change size', () => {
      // console.log(wellbores.groups)
      // console.log(wellbores.pixiOverlay._map.getZoom())

      // wellbores.groups['Planned'].wellboreWidth = 8.0;
      wellbores.groups['Planned'].wellboreWidth = wellbores.groups['Planned'].wellboreWidth + 1.0;
      wellbores.clear('Planned')
      wellbores.set(planned, 'Planned');
      // wellbores.resize(wellbores.pixiOverlay._map.getZoom());
      // wellbores.pixiOverlay.redraw();
      // console.log(wellbores.groups)
    });

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    let faultlinesVisible = true;

    const toggleFaultlines = () => {
      faultlinesVisible = !faultlinesVisible;
      // console.log(faultlinesVisible)
      // console.log(faultlines)
      faultlines.setVisibility(faultlinesVisible);
    }

    const groupFilter = sidebar.addGroup('Filter');

    groupFilter.add('Has completion (Hard)', () => {
      wellbores.hardFilter(d => d.intervals.length > 0);
    });

    groupFilter.add('Has completion (Soft)', () => {
      wellbores.softFilter(d => d.intervals.length > 0);
    });

    groupFilter.add('Reset filter', () => {
      wellbores.clearFilter();
    });

    const groupClear = sidebar.addGroup('Clear');

    groupClear.add('Clear \'Drilled\'', () => {
      wellbores.clear('Drilled');
    });

    groupClear.add('Clear \'Planned\'', () => {
      wellbores.clear('Planned');
    });

    groupClear.add('Clear all', () => {
      wellbores.clear();
    });

    const groupLblUnderRoot = sidebar.addGroup('Label under root');

    const attachToRoot = (attach: boolean, key: string) => {
      const roots = new Set<RootData>();
      wellbores.groups[key].wellbores.forEach(d => {
        roots.add(d.root);
        d.label.attachToRoot = attach ? true : d.interpolator.singlePoint;
      });
      roots.forEach(root => root.updateLabels());
      wellbores.pixiOverlay.redraw();
    }

    let drilledUnderRoot = false, plannedUnderRoot = false;

    groupLblUnderRoot.add('Toggle \'Drilled\'', () => {
      drilledUnderRoot = !drilledUnderRoot;
      attachToRoot(drilledUnderRoot, 'Drilled');
    });

    groupLblUnderRoot.add('Toggle \'Planned\'', () => {
      plannedUnderRoot = !plannedUnderRoot;
      attachToRoot(plannedUnderRoot, 'Planned');
    });


    const groupHighlightOverride = sidebar.addGroup('Highlight');

    groupHighlightOverride.add('31/3-Q-21 AY1H', () => {
      wellbores.setHighlight('NO 31/3-Q-21 AY1H', 'Drilled');
    });

    groupHighlightOverride.add('31/2-3', () => {
      wellbores.setHighlight('NO 31/2-3', 'Drilled');
    });

    groupHighlightOverride.add('Clear highlight', () => {
      wellbores.clearHighlight();
    });


    const groupAnimate = sidebar.addGroup('Animate');

    groupAnimate.add('Animate 1970 to 2020', () => {
      let year = 1970;
        let handle: any;
        const func = () => {
          wellbores.softFilter(d => d.drillEndYear < year);
          year++;
          if (year > 2020) clearInterval(handle);
        };

        handle = setInterval(func, 200);
    });

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    const groupGeoJSON = sidebar.addGroup('GeoJSON');

    type SingleGeoJSON = { module: GeoJSONModule, data: any, props: (feature: any) => any, loaded?: boolean, visible: boolean }

    const licenseProps = (feature: any) => ({
      label: feature.properties.prlName,
      id: feature.properties.prlNpdidLicence,
      style: {
        lineColor: 'blue',
        // lineWidth: 0.1,
        outlineResize: {
          min: { zoom: 7, scale: 0.8 },
          max: { zoom: 17, scale: 0.05 },
        },
        labelResize: {
          min: { zoom: 0, scale: 4.0 },
          max: { zoom: 17, scale: 2.45 },
          threshold: -1,
          // baseScale: 0.57,
        },
        fillColor: feature.properties.prlActive === 'Y' ? 'blue' : 'grey',
        fillOpacity: 0.6,
      },
      additionalData: {},
    });

    const pipelineProps = (feature: any) => ({
      label: feature.properties.pplName,
      id: feature.properties.pplNpdidPipeline,
      style: {
        lineColor: 'red',
        lineWidth: 3,
        fillColor: 'red',
        fillOpacity: 0.6,
      },
     additionalData: {},
    });

    const facilityProps = (feature: any) => ({
      label: feature.properties.fclName,
      id: feature.properties.fclNpdidFacility,
      style: {
        lineColor: 'black',
        lineWidth: 0.05,
        fillColor: 'grey',
        // fillColor2: 'red',
        fillOpacity: 0.7,
        pointSize: 0.5,
        // pointShape: 'circle',
        // pointShape: 'image',
        pointShape: 'filletrect',
        // pointShape: 'regularpolygon',
        pointOptions: {
          pointFillet: 1,
          // pointRectangularSides: 3,
          // pointRotation: 0,
          pointScale: 0.01,
          // pointImage: feature.properties.fclKind === 'MULTI WELL TEMPLATE' ? 'https://trollmapsst.blob.core.windows.net/static/images/risks/radioactive.png?sv=2020-04-08&st=2021-09-29T18%3A56%3A17Z&se=2021-09-30T18%3A56%3A17Z&sr=b&sp=r&sig=gLldLoR4fiwBNBnmfxzQxKeTI8bOJD6vk9DjUShy%2F8I%3D' : 'https://trollmapsst.blob.core.windows.net/static/images/risks/loss.png?sv=2020-04-08&st=2021-09-29T19%3A05%3A01Z&se=2021-09-30T19%3A05%3A01Z&sr=b&sp=r&sig=9QIMAIm34XPgweDiXdZ92tl45%2FtxOtAor7X6jDsAMp8%3D',
          pointImage: 'https://trollmapsst.blob.core.windows.net/static/images/risks/csand.png?sv=2020-04-08&st=2021-10-01T11%3A50%3A48Z&se=2021-10-16T11%3A50%3A00Z&sr=b&sp=r&sig=Aqv1jcGIj7SnRpbmnfj%2BX4uUZv6rw2Dgaatp%2Bs7sin8%3D',
        }
        // pointShape: 'square',
        // hashed: true,
        // labelScale: 1,
      },
     additionalData: {},
    });

    const prospectProps = (feature: any) => {
      // console.log(feature)
      // const period = feature.properties?.chronoPeriod?.toLowerCase();
      // const { fillColor, lineColor } = ProspectColors.valid(period) ? ProspectColors.get(period) : { fillColor: '#666666', lineColor: '#444444' };

      return {
        label: feature.properties.prospectName,
        id: feature.properties.prospectAnalysisId,
        style: {
          // lineColor,
          lineColor: '#444444',
          // lineWidth: 0.1,
          // fillColor,
          fillColor: '#fff004',
          fillOpacity: 0.6,
          // outlineResize: {
          //   min: { zoom: 7, scale: 0.8 },
          //   max: { zoom: 17, scale: 0.05 },
          // },
          // labelResize: {
          //   min: { zoom: 0, scale: 4.0 },
          //   max: { zoom: 17, scale: 2.45 },
          //   threshold: -1,
          //   // baseScale: 0.57,
          // },
        },
      additionalData: {},
      }
    };

    let prospectDataNew = transformProspectData(prospectData);
    // let prospectDataNew = prospectData;

    const licenseGeoJSON: SingleGeoJSON = { module: licenses, data: licenseData, props: licenseProps, visible: false };
    const pipelineGeoJSON: SingleGeoJSON = { module: pipelines, data: pipelineData, props: pipelineProps, visible: false };
    const facilityGeoJSON: SingleGeoJSON = { module: facilities, data: facilityData, props: facilityProps, visible: false };
    const prospectGeoJSON: SingleGeoJSON = { module: prospects, data: prospectDataNew, props: prospectProps, visible: false };

    const toggleGeoJSON = (collection: any) => {
      collection.visible = !collection.visible;

      if (collection.visible && !collection.loaded) {
        collection.loaded = true;
        collection.module.set(collection.data, collection.props);
        // collection.module.cache();
      }

      collection.module.setVisibility(collection.visible);
    }


    groupGeoJSON.add('Toggle licenses', () => toggleGeoJSON(licenseGeoJSON));
    groupGeoJSON.add('Toggle pipelines', () => toggleGeoJSON(pipelineGeoJSON));
    groupGeoJSON.add('Toggle facilities', () => toggleGeoJSON(facilityGeoJSON));
    groupGeoJSON.add('Toggle prospects', () => toggleGeoJSON(prospectGeoJSON));
    groupGeoJSON.add('Toggle faultline', () => toggleFaultlines());
  });

  return root.node();
};
