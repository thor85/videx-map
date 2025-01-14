/* eslint-disable curly */
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
    status?: string;
    label: string;
    lat: number;
    long: number;
  };
}

/**
 * Preprocess field data to a more managable format.
 * @param data Data to process
 * @returns Processed data
 */
export default function preprocessFields(data: Field[]): PreprocessedField[] {
  const unique: {[key: string]: PreprocessedField} = {};

  data.forEach(f => {
    // console.log(field)
    // Change properties keys to lowercase
    // @ts-ignore
    const properties = Object.fromEntries(
      Object.entries(f.properties).map(([k, v]) => [k.toLowerCase(), v])
    );
    // console.log(f)
    let field: Field = {
      type: f.type,
      geometry: f.geometry,
      //@ts-ignore
      properties: properties,
    };
    // console.log(field)

    const fieldName: string = field.properties.label;

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
          hctype: field.properties.dsc_hctype,
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
      unique[fieldName] = {
        type: field.geometry.type,
        geometry: [
          {
            coordinates: coordinates[0],
            properties: {
              ...field.properties,
              // discname: field.properties.discname,
              // hctype: field.properties.hctype,
              hctype: field.properties.dsc_hctype,
              // polygonId: field.properties.polygonId,
              // status: field.properties.status,
            }
          }
        ],
        properties: {
          group: field.properties.group,
          guid: field.properties.guid,
          label: field.properties.label,
          hctype: field.properties.dsc_hctype,
          status: field.properties.dscactstat,
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
