
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

export interface IEntity {
  id: number;
  name: string;
  restrictions: Array<NonNullable<Country>>;
}

export class Entity implements IEntity {
  id: number;
  name: string;
  restrictions: Country[];

  constructor({ id, name, restrictions }: IEntity) {
    this.id = id;
    this.name = name;
    this.restrictions = restrictions;
  }
}

export interface IUser {
  id: number;
  name: string;
  country: NonNullable<Country>;
}

export class User implements IUser {
  id: number;
  name: string;
  country: NonNullable<Country>;

  constructor({ id, name, country }: IUser) {
    this.id = id;
    this.name = name;
    this.country = country;
  }
}
