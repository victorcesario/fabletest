// Service-call content. Add a new entry here to add a new job to the game.
// `answer` is the index of the correct option.
export const JOBS = [
  {
    customer: 'Mrs. Alvarez', appliance: 'fridge', name: 'Refrigerator',
    symptom: "My fridge is warm inside, but the freezer still works fine!",
    options: ['Evaporator fan motor', 'Door handle', 'Water filter'], answer: 0,
  },
  {
    customer: 'Mr. Chen', appliance: 'washer', name: 'Washer',
    symptom: "The washer fills up and washes, but the water never drains out.",
    options: ['Detergent tray', 'Drain pump', 'Door gasket'], answer: 1,
  },
  {
    customer: 'Ms. Johnson', appliance: 'oven', name: 'Oven',
    symptom: "The oven turns on, but it never gets hot. Dinner is ruined!",
    options: ['Oven light bulb', 'Clock display', 'Bake igniter'], answer: 2,
  },
  {
    customer: 'Mr. Patel', appliance: 'dishwasher', name: 'Dishwasher',
    symptom: "Dishes come out dirty and I can't hear any water spraying.",
    options: ['Circulation pump', 'Cutlery basket', 'Rinse-aid cap'], answer: 0,
  },
  {
    customer: 'Mrs. Rossi', appliance: 'dryer', name: 'Dryer',
    symptom: "The dryer tumbles like normal, but the clothes stay cold and wet.",
    options: ['Lint screen', 'Heating element', 'Drum light'], answer: 1,
  },
  {
    customer: 'Mr. Okafor', appliance: 'washer', name: 'Washer',
    symptom: "It makes a loud banging noise and shakes across the floor on spin.",
    options: ['Water inlet valve', 'Control knob', 'Shock absorbers'], answer: 2,
  },
  {
    customer: 'Ms. Dubois', appliance: 'fridge', name: 'Refrigerator',
    symptom: "The ice maker stopped making ice, and no water comes from the door.",
    options: ['Water inlet valve', 'Crisper drawer', 'Door shelf'], answer: 0,
  },
  {
    customer: 'Mr. Kim', appliance: 'dryer', name: 'Dryer',
    symptom: "I press start and hear a hum, but the drum doesn't turn at all.",
    options: ['Moisture sensor', 'Drive belt', 'Vent hose'], answer: 1,
  },
];
