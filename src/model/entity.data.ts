import { Country, IEntity } from './types';

export const entities: IEntity[] = [
  {
    id: 1,
    name: 'Entity #1',
    restrictions: [Country.SPAIN, Country.FRANCE],
  },
  {
    id: 2,
    name: 'Entity #2',
    restrictions: [],
  },
  {
    id: 3,
    name: 'Entity #3',
    restrictions: [Country.UNITED_STATES, Country.CANADA],
  },
  {
    id: 4,
    name: 'Entity #4',
    restrictions: [Country.SPAIN, Country.FRANCE],
  },
  {
    id: 5,
    name: 'Entity #5',
    restrictions: [Country.UNITED_STATES, Country.CANADA],
  },
  {
    id: 6,
    name: 'Entity #6',
    restrictions: [Country.AUSTRALIA, Country.NEW_ZEALAND],
  },
  {
    id: 7,
    name: 'Entity #7',
    restrictions: [Country.UNITED_STATES],
  },
  {
    id: 8,
    name: 'Entity #8',
    restrictions: [Country.COLOMBIA, Country.PERU],
  },
  {
    id: 9,
    name: 'Entity #9',
    restrictions: [],
  },
  {
    id: 10,
    name: 'Entity #10',
    restrictions: [Country.COLOMBIA, Country.PERU],
  },
];