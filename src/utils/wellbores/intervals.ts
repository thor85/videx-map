import { Interval } from './data';

/**
 * Combines overlapping intervals.
 * @param intervals A collection of intervals on the format: [start, stop]
 * @returns Array with compressed intervals
 *
 * @example compressInterval([ [1, 5], [4, 7] ]); // Returns: [[1, 7]]
 */
export function compressIntervals(intervals: [number, number, number, string][]): [number, number, number, string][] {
  const output: [number, number, number, string][] = [];

  // Set previous interval to first
  let prev: [number, number, number, string] = intervals[0].slice(0) as [number, number, number, string];

  for (let i: number = 1; i < intervals.length; i++) {
    const cur: [number, number, number, string]  = intervals[i].slice(0) as [number, number, number, string];
    if(cur[0] < prev[1]) { // If inside
      if(cur[1] > prev[1]) prev[1] = cur[1]; // Consume
    } else { // New interval
      output.push(prev);
      prev = cur;
    }
  }

  // Push last
  output.push(prev);

  return output;
}

/**
 * Sorts intervals by length and compresses.
 * @param intervals Intervals to process
 * @returns Processed intervals
 */
export function processIntervals(intervals: Interval[]): {screens: [number, number, number, string][], packers: [number, number][]} {
  let screens = intervals.filter(obj => {
    return obj.type === 'Screen' || obj.type === 'Blank'
  })
  let packers = intervals.filter(obj => {
    return obj.type === 'Packer'
  })
  // console.log(screens)
  // console.log(packers)
  let screensOutput: [number, number, number, string][] = screens.map(i => [i.l1, i.l2, i.log, i.type] as [number, number, number, string])
    .sort((a, b) => { // Sort intervals
      if (a[0] < b[0]) return -1;
      return (a[0] > b[0]) ? 1 : 0;
    });
  if (screensOutput.length > 0) screensOutput = compressIntervals(screensOutput);

  let packersOutput: [number, number][] = packers.map(i => [i.l1, i.l2] as [number, number])
    .sort((a, b) => { // Sort intervals
      if (a[0] < b[0]) return -1;
      return (a[0] > b[0]) ? 1 : 0;
    });
  return {screens: screensOutput, packers: packersOutput};
}
// export function processIntervals(intervals: Interval[]): [number, number][] {
//   let output: [number, number][] = intervals.map(i => [i.l1, i.l2] as [number, number])
//     .sort((a, b) => { // Sort intervals
//       if (a[0] < b[0]) return -1;
//       return (a[0] > b[0]) ? 1 : 0;
//     });
//   if (output.length > 0) output = compressIntervals(output);
//   return output;
// }
