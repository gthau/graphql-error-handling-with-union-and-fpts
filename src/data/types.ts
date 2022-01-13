export enum Country {
  AUSTRALIA = 'Australia',
  CANADA = 'Canada',
  COLOMBIA = 'Colombia',
  FRANCE = 'France',
  NEW_ZEALAND = 'New Zealand',
  PERU = 'Peru',
  SPAIN = 'Spain',
  UNITED_STATES = 'United States',
}

export interface Entity {
  id: number;
  name: string;
  restrictions: Array<NonNullable<Country>>;
}

export interface User {
  id: number;
  name: string;
  country: NonNullable<Country>;
}
