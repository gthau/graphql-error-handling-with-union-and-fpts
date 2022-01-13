import { entities } from './entity.data';
import { Entity, User } from './types';
import { users } from './user.data';

export const getEntity = (id: number): Entity | undefined => entities.find(e => e.id === id);

export const getUser = (id: number): User | undefined => users.find(u => u.id === id);

export const isUserAllowedForEntity = (user: User, entity: Entity): boolean => {
  return !entity.restrictions.includes(user.country);
}
