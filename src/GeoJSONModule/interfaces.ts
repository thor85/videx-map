export interface FeatureStyle {
  lineColor: string;
  lineWidth: number;
  fillColor?: string;
  fillColor2?: string;
  fillOpacity?: number;
  hashed?: boolean;
  labelScale?: number;
  pointShape?: string;
  pointSize?: number;
  pointOptions?: {
    [name: string]: any;
  }
  // pointFillet?: number;
}

export interface FeatureProps {
  id: number;
  label: string;
  labelLocLat: number;
  labelLocLng: number;
  labelLocAngle: number;
  style: FeatureStyle;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any  */
  additionalData?: any;
}
