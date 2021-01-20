import { SourceData } from "../src/utils/wellbores/data/SourceData";
import { Group } from "../src/utils/wellbores/data";
import { getDefaultColors } from "../src/utils/wellbores/Colors";

export const wellbores: SourceData[] = [
  {
    wellboreGuid: 0,
    label: 'test 0',
    labelShort: 't 0',
    path: [[58.855788387267, 2.543368830442528], [58.85575958107332, 2.5433219063950014]],
    intervals: [],
    category: 'category 2',
  },
  {
    wellboreGuid: 1,
    label: 'test 1',
    labelShort: 't 1',
    path: [[58.80497455688749, 2.572162475322856], [58.80496483232179, 2.572127822885036], [58.80496691424708, 2.5721056427727693], [58.80494514438075, 2.5721192380954445], [58.80482386608588, 2.572065535607058], [58.80478489989248, 2.572039205148433], [58.804737631681526, 2.571998265119195], [58.80469490170108, 2.571944634429551], [58.8046616436201, 2.57187653883572]],
    intervals: [
      {
        type: "Screen",
        start: 2385.003,
        end: 2563.084,
        l1: 0.8249076389931117,
        l2: 0.9792482891676622,
      },
      {
        type: "Perforation",
        start: 2335.2,
        end: 2335.5,
        l1: 0.7821686833117228,
        l2: 0.7824229990179772,
      },
    ],
    category: 'category 2',
  },
  {
    wellboreGuid: 2,
    label: 'test 2',
    labelShort: 't 2',
    path: [[58.746786356100614, 2.6328190477437956], [58.746794527658786, 2.632818616026341], [58.74679121312138, 2.6328215884301645], [58.74675591723601, 2.6329129872797483], [58.74675001461901, 2.632918578823121], [58.746728816577274, 2.6329144824060435], [58.746733435467036, 2.632836539160537], [58.74674614950184, 2.632696668321245], [58.746756771129625, 2.6326136507328406], [58.746790967350606, 2.632451608465392], [58.74689370519499, 2.6321189007778596], [58.746916492460194, 2.63205044153801], [58.74695288313459, 2.6319652330888923], [58.74697056004352, 2.6319313689639108], [58.74697295428371, 2.6319206304962197], [58.746993808412796, 2.631930086558839]],
    intervals: [],
    category: 'category 2'
  },
  {
    wellboreGuid: 3,
    label: 'test 3',
    labelShort: 't 3',
    path: [[58.885869600362675, 2.4883189352686506], [58.88586580522897, 2.488313092769074], [58.88586590182015, 2.488292116781322], [58.88585745064012, 2.488287557466474], [58.88586218481601, 2.488283323854986], [58.885858680381645, 2.488282855158076]],
    intervals: [],
    category: 'category 3',
  },
  {
    wellboreGuid: 4,
    label: 'test 4',
    labelShort: 't 4',
    path: [[58.80497455688749, 2.572162475322856], [58.804963932533916, 2.572127314716857], [58.804969502842866, 2.5721279384674545], [58.80501578543262, 2.572169583405927], [58.805145248527865, 2.5723055385910727], [58.80535172051783, 2.57254624967431], [58.80562788058952, 2.5728752285218164], [58.80573689613108, 2.5729930928493627], [58.8058558663682, 2.5731066815662476], [58.80636989875029, 2.573564072438833], [58.806509451521, 2.573685374792768], [58.80665717772629, 2.573806924061812], [58.80713817847642, 2.5741835945794405], [58.80782483309333, 2.5747451342834986], [58.8081528632445, 2.5750172628618757], [58.80914762180921, 2.5758780710985554], [58.80948636834896, 2.5761597837856605], [58.80965767106475, 2.5762988962583604], [58.80983749116842, 2.576436348320287], [58.81015937685969, 2.576668093471858], [58.81047287044781, 2.5768878447492853], [58.81062576555479, 2.5769981236340915], [58.81076958899413, 2.5771109201328044], [58.810852156184986, 2.5771836259684444], [58.81112016404645, 2.577440293076127], [58.81145555350582, 2.5777675893824097], [58.81165738003955, 2.5779613801098304], [58.81196623272048, 2.5782732549375633]],
    intervals: [],
    category: 'category 1',
  },
  {
    wellboreGuid: 5,
    label: 'test 5',
    labelShort: 't 5',
    path: [[58.841899452059494, 2.5172341429391514], [58.84189973507435, 2.517237777602014], [58.84189308040334, 2.5172354444413787], [58.84189893589058, 2.517240214452529], [58.841908149592356, 2.5172303833473304], [58.84191232714878, 2.5172211420966857], [58.84196748658643, 2.5171341224411536]],
    intervals: [],
    category: 'category 2',
  },
  {
    wellboreGuid: 6,
    label: 'test 6',
    labelShort: 't 6',
    path: [[58.78469689402867, 2.5595421320624916], [58.78469670024427, 2.559537982969052], [58.784699846435025, 2.5595388080337576], [58.78470013888288, 2.559545550595549], [58.78470185584027, 2.5595486425146077], [58.78470382332401, 2.559546195863957], [58.78470717720049, 2.5594500104467603], [58.78470256457133, 2.5594405549050556], [58.784704711076074, 2.5594379329995443], [58.784677578870344, 2.5594588614043587]],
    intervals: [],
    category: 'category 2',
  },
  {
    wellboreGuid: 7,
    label: 'test 7',
    labelShort: 't 7',
    path: [[58.84160880526249, 2.5172284832231346], [58.84159684277359, 2.5171973059674237], [58.84159358830294, 2.51709550599793], [58.84160335329007, 2.5170193413579334]],
    intervals: [],
    category: 'category 2',
  },
  {
    wellboreGuid: 8,
    label: 'test 8',
    labelShort: 't 8',
    path: [[58.834258524817194, 2.6528409196534253], [58.83425313033659, 2.6528387216473295], [58.83423666928226, 2.6528591538265545], [58.83423479911611, 2.652865044923884], [58.83422609480867, 2.652867730368094], [58.83422340538533, 2.652866198218322], [58.8342179420492, 2.6528717961113064], [58.83419852387096, 2.6528612675396204], [58.83419214709936, 2.652861158078517], [58.83418849475797, 2.6528722637928333], [58.83418963622525, 2.6528959844502076], [58.83419799619359, 2.652932261175119], [58.83421617617555, 2.6529833372665887], [58.83424238522243, 2.653047827551108], [58.83427669678979, 2.65312299437943], [58.83431910114137, 2.6532018741897425], [58.834361292027474, 2.653264819380357], [58.83440405796063, 2.653311146428785], [58.83444002655164, 2.6533345194588764], [58.83450184963384, 2.653357270587648], [58.83455761770546, 2.65336260348683], [58.834557418099415, 2.6533551566489186]],
    intervals: [],
    category: 'category 2',
  },
  {
    wellboreGuid: 9,
    label: 'test 9',
    labelShort: 't 9',
    path: [[58.834258524817194, 2.6528409196534253], [58.83425313033659, 2.6528387216473295], [58.83423666928226, 2.6528591538265545], [58.83423479911611, 2.652865044923884], [58.83422609480867, 2.652867730368094], [58.83422340538533, 2.652866198218322], [58.83420584229681, 2.652880924899141], [58.834199030125966, 2.6528825520564707], [58.83420686183149, 2.6528592786668646], [58.83423432824425, 2.6528569252851173], [58.834326471212584, 2.6529031044204765], [58.83439530863679, 2.6529292491355014], [58.834479203771465, 2.6529474654723666], [58.834575372176836, 2.652954282012898], [58.83468370910815, 2.652947482381808], [58.834803221699666, 2.6529218794749876], [58.83493183581394, 2.652877649720774], [58.83506977029328, 2.652826050715517], [58.835549730336496, 2.6526690475047716], [58.83572910735204, 2.652605771772582], [58.83591617283541, 2.6525294430919635], [58.83610983398989, 2.6524378027456255], [58.83716820851286, 2.651912885369826], [58.83739448693163, 2.651797523290089], [58.83762272468837, 2.651676093824535], [58.837851215384674, 2.651548596638609], [58.838533869420644, 2.6511538226495737], [58.838761016622406, 2.651027874082508], [58.83898863805849, 2.6509112919571636], [58.83921449551032, 2.6508066630997433], [58.84013778458827, 2.650429186318025], [58.84083475295511, 2.6501512915434704], [58.841750038110135, 2.6497672589222687], [58.8430288650172, 2.649202536668044], [58.84399874220742, 2.64875902291538], [58.844334644644405, 2.6486160132839367], [58.84463185125201, 2.648503889967223], [58.84531516737599, 2.6482568855032267], [58.845862739228494, 2.648040706732803]],
    intervals: [],
    category: 'category 2',
  },
];

export const group = new Group('Drilled');
export const group2 = new Group('Planned', { colors: {
  defaultColor1: [0, 0, 1.0],
  defaultColor2: [0, 0, 0.8]
  }});