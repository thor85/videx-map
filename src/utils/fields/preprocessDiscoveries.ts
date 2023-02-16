import { Field } from '../../FieldModule';

/** Interface for data within a processed field. */
export interface PreprocessedField {
  type: string;
  geometry: [
    {
      coordinates: [number, number][];
      properties: {
        discname: string;
        hctype: string;
        polygonId: number;
        status: string;
      };
    }
  ];
  properties: {
    group: number;
    guid?: number;
    hctype?: string;
    discoveryyear?: number;
    company?: string;
    owner?: string;
    status?: string;
    dscnpdiddiscovery?: number;
    label: string;
    lat: number;
    long: number;
  };
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Preprocess field data to a more managable format.
 * @param data Data to process
 * @returns Processed data
 */
export default function preprocessDiscoveries(data: Field[]): PreprocessedField[] {
  const unique: {[key: string]: PreprocessedField} = {};

  data.forEach(f => {
    // if (!f.geometry.hasOwnProperty('coordinates')) return;
    // if (!f.geometry.coordinates) {console.log("skipping for " + f); return};
    if ((f.geometry.coordinates).length === 0) return;

    // Change properties keys to lowercase
    // @ts-ignore
    const properties = Object.fromEntries(
      Object.entries(f.properties).map(([k, v]) => [k.toLowerCase(), v])
    );
    // console.log(properties)
    // console.log(f)
    let field: Field = {
      type: f.type,
      geometry: f.geometry,
      properties: properties,
    };
    // console.log(field)

    // const fieldName: string = field.properties.label;
    const fieldName: string = field.properties.dscname;

    let coordinates: [number, number][][] = [];

    const geometry = field.geometry;
    if (geometry.type === 'Polygon') {
      coordinates = geometry.coordinates as [number, number][][];
    } else {
      const multipolygons = geometry.coordinates as [number, number][][][];
      for(let i: number = 0; i < multipolygons.length; i++) {
        coordinates.push(...multipolygons[i]);
      }
    }

    // Append index
    function appendIndex(index: number) {
      unique[fieldName].geometry.push({
        coordinates: coordinates[index],
        properties: {
          ...field.properties,
          // discname: field.properties.discname,
          // hctype: field.properties.hctype,
          // hctype: field.properties.dsc_hctype,
          hctype: field.properties.dschctype,
          // polygonId: field.properties.polygonId,
          // status: field.properties.status,
        },
      });
    }

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Append polygon(s)
    if(unique.hasOwnProperty(fieldName)){
      for (let i: number = 0; i < coordinates.length; i++) appendIndex(i);
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Push new polygon. Append additional.
    } else {
      let label = field.properties.dscname;
      if (field.properties.fldname) {
        label = capitalizeFirstLetter(field.properties.fldname)
      } else {
        if (field.properties.wlbname !== field.properties.dscname) {
          label = (field.properties.dscname).replace(field.properties.wlbname, '');
          label = label.replace('(', '').replace(')', '')
        }
      }

      let hctype = field.properties.dschctype;
      if (field.properties.dscname === '31/6-1 (Troll Øst)') hctype = 'GAS';

      unique[fieldName] = {
        type: field.geometry.type,
        geometry: [
          {
            coordinates: coordinates[0],
            properties: {
              ...field.properties,
              // discname: field.properties.discname,
              // discname: field.properties.dscname,
              // hctype: field.properties.hctype,
              // hctype: field.properties.dsc_hctype,
              // hctype: field.properties.dschctype,
              hctype: hctype,
              // polygonId: field.properties.polygonId,
              // status: field.properties.status,
            }
          }
        ],
        properties: {
          group: field.properties.group,
          guid: field.properties.guid,
          dscnpdiddiscovery: field.properties.dscnpdiddiscovery,
          // label: field.properties.label,
          // label: field.properties.dscname,
          label: label,
          // hctype: field.properties.dsc_hctype,
          // hctype: field.properties.dschctype,
          hctype: hctype,
          discoveryyear: field.properties.dscdiscoveryyear,
          owner: field.properties.dscownername,
          company: field.properties.cmplongname,
          // status: field.properties.dscactstat,
          status: field.properties.dsccurrentactivitystatus,
          lat: field.properties.lat,
          long: field.properties.long,
        }
      }

      if (coordinates.length > 1) {
        for (let i: number = 1; i < coordinates.length; i++) appendIndex(i);
      }
    }

  });

  return Object.values(unique);
}
