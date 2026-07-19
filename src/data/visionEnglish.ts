type VisionCopy = {
  question: string
  options: [string, string, string, string]
}

export const visionEnglish: Record<string, VisionCopy> = {
  V001: { question: 'What piece of sports equipment is under the child’s feet?', options: ['Snowboard', 'Surfboard', 'Sled', 'Skateboard'] },
  V002: { question: 'What kind of flowers make up most of the bouquet in the vase?', options: ['Roses', 'Tulips', 'Sunflowers', 'Orchids'] },
  V003: { question: 'What is the green fruit cut in half on the plate?', options: ['Green apple', 'Lime', 'Avocado', 'Kiwi'] },
  V004: { question: 'What is the large vehicle in the center of the image?', options: ['Train', 'Truck', 'Tram', 'Bus'] },
  V005: { question: 'What fruit is the hand holding in the foreground?', options: ['Banana', 'Pear', 'Mango', 'Lemon'] },
  V006: { question: 'How many complete road signs appear inside the blue border?', options: ['3', '4', '5', '6'] },
  V007: { question: 'How many people are visible in the snowy scene?', options: ['6', '7', '8', '9'] },
  V008: { question: 'How many birds are perched on the branches?', options: ['6', '7', '9', '8'] },
  V009: { question: 'How many people are visible in the image?', options: ['8', '7', '9', '10'] },
  V010: { question: 'How many people are walking with umbrellas?', options: ['2', '3', '4', '5'] },
  V011: { question: 'What is placed to the right of the bowl of soup?', options: ['Spoon', 'Fork', 'Chopsticks', 'Table knife'] },
  V012: { question: 'What is the most prominent piece of furniture behind the foot of the bed?', options: ['Wardrobe', 'Sofa', 'Bookshelf', 'Chair'] },
  V013: { question: 'What animal is partly visible behind the giraffe?', options: ['Ostrich', 'Zebra', 'Antelope', 'Flamingo'] },
  V014: { question: 'What accessory is placed above the white collared shirt?', options: ['Belt', 'Tie', 'Scarf', 'Gloves'] },
  V015: { question: 'Which direction does the small arrow under the distant traffic light point?', options: ['Left', 'Right', 'Up', 'Down'] },
  V016: { question: 'What English word appears in the image?', options: ['EXPERIMENT', 'EXPEDITION', 'EXPRESSION', 'EXPERIENCE'] },
  V017: { question: 'What does the green stylized text say?', options: ['WOODZILLA', 'WOODVILLA', 'WORDZILLA', 'WOODZILIA'] },
  V018: { question: 'What handwritten English word appears in the image?', options: ['firmly', 'grimly', 'grimy', 'family'] },
  V019: { question: 'What is the exact case-sensitive string in the image?', options: ['idUnit', 'idUnite', 'idUnte', 'idUrite'] },
  V021: { question: 'According to the table, what was the total intrinsic value of options exercised in 2008?', options: ['$506 million', '$560 million', '£506 million', '$5.06 million'] },
  V022: { question: 'Which date range is listed for the Advisory Board Meeting?', options: ['October 6–8, 1961', 'October 8–10, 1961', 'October 10–12, 1961', 'October 8–10, 1962'] },
  V023: { question: 'What value does the table list for Sales in 2013?', options: ['92,538', '93,258', '93,528', '95,328'] },
  V024: { question: 'Who is entered after the “TO:” field on the form?', options: ['MR. K. A. SPARROW', 'MRS. K. E. SPARROW', 'MRS. R. A. SPARROW', 'MRS. K. A. SPARROW'] },
  V025: { question: 'How much sodium per 100 g is listed on the nutrition label?', options: ['224 mg', '96 mg', '24 mg', '244 mg'] },
  V026: { question: 'What percentage of respondents described Trump as “Dangerous”?', options: ['55%', '62%', '65%', '75%'] },
  V027: { question: 'In which year does the line reach its peak?', options: ['2012', '2013', '2014', '2015'] },
  V028: { question: 'Which country had the highest secondary-school graduation rate in 2018?', options: ['Spain', 'Mexico', 'South Korea', 'Italy'] },
  V029: { question: 'Which game genre is the least popular in the chart?', options: ['Simulation', 'Racing', 'Strategy', 'Shooter'] },
  V030: { question: 'Which country is represented by the dark green color?', options: ['United Kingdom', 'United States', 'France', 'Germany'] },
  V031: { question: 'Is the sum of “Charismatic” and “Well-qualified to be president” greater than “A strong leader”?', options: ['No', 'They are equal', 'Yes', 'Cannot be determined from the chart'] },
  V032: { question: 'In which year is the gap between the boys’ and girls’ lines the largest?', options: ['2006', '2007', '2009', '2008'] },
  V033: { question: 'How many yearly points on the Lithuania line are above 10?', options: ['5', '4', '6', '7'] },
  V034: { question: 'What is the average of the last three values on the green line, rounded to one decimal place?', options: ['27.6', '28.6', '29.6', '30.6'] },
  V035: { question: 'What is the difference between the highest and lowest Human Development Index values shown?', options: ['0.13', '0.18', '0.23', '0.28'] },
  V036: { question: 'How many stages are shown in this insect life-cycle diagram?', options: ['2', '3', '5', '4'] },
  V037: { question: 'Which body part does label B point to in the insect diagram?', options: ['Mouthpart', 'Leg', 'Compound eye', 'Antenna'] },
  V038: { question: 'What stage of the frog life cycle is labeled A?', options: ['Tadpole', 'Eggs', 'Froglet', 'Adult frog'] },
  V039: { question: 'Which organism in the diagram feeds directly on phytoplankton?', options: ['Bacteria', 'Planktivorous fish', 'Zooplankton', 'Piscivorous fish'] },
  V040: { question: 'Which letter marks the position of the early-morning sun?', options: ['A', 'C', 'D', 'B'] },
  V041: { question: 'What total span is marked along the bottom of the truss diagram?', options: ['90 ft', '75 ft', '105 ft', '120 ft'] },
  V042: { question: 'What diameter is marked for the narrow tube in the nozzle drawing?', options: ['2 cm', '4 cm', '8 cm', '12 cm'] },
  V044: { question: 'What value is shown on the right-hand inductor in circuit (c)?', options: ['2 H', '5 H', '6 H', '8 H'] },
  V045: { question: 'What value is marked on the torque arrow at the far right of the shaft?', options: ['5 kN·m', '2 kN·m', '4.5 kN·m', '1 kN·m'] },
  V046: { question: 'What state is the “Accessible Trip” switch in on the left trip-planning panel?', options: ['ON', 'NO / Off', 'Not visible', 'Loading'] },
  V047: { question: 'What price is shown for Organic Grass Fed 93/7 Ground Beef on the ALDI page?', options: ['$3.75/lb', '$4.25/lb', '$4.75/lb', '$5.75/lb'] },
  V048: { question: 'What record is shown for the fifth-place team in the NBA Eastern Conference?', options: ['39–29', '40–27', '41–28', '40–28'] },
  V049: { question: 'What does the blue-green button in the upper-right corner say?', options: ['SUBSCRIBE', 'SIGN IN', 'SEARCH', 'JOIN NOW'] },
  V050: { question: 'Which symbol is on the calculator key between EXP and M−?', options: ['×', '÷ (/)', '+', '%'] },
  V051: { question: 'What upside-down red English word appears on the car key in the upper left?', options: ['POWER', 'PARK', 'PANIC', 'PUNCH'] },
  V052: { question: 'Following the blue pipe from state point 4 to state point 1, which component does it pass through?', options: ['Condenser', 'Compressor', 'Expansion valve', 'Evaporator'] },
}

export function localizeVisionCase<T extends { id: string; question: string; options: string[] }>(item: T): T {
  const copy = visionEnglish[item.id]
  return copy ? { ...item, question: copy.question, options: [...copy.options] } : item
}
