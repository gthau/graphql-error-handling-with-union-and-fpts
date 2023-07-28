import { ConnectionError } from '../errors';
import { entities } from './data/entity.data';
import { users } from './data/user.data';
import { Entity, User, UserId } from './types';

export const fetchEntity = async (id: number): Promise<Entity> => {
  const entity = entities.find(e => e.id === id);
  if (!entity) throw new Error(`Entity ${id} not found`);
  return new Entity(entity);
}

export const fetchEntities = async (ids: number[]): Promise<(Entity | Error)[]> => {
  // simulate an API failure, such as Connectivity issue
  if (ids.includes(9999)) {
    throw new ConnectionError('SDK Failure: fetch entities');
  }

  return ids.map(id => {
    const entity = entities.find(e => e.id === id);
    return entity ? new Entity(entity) : new Error(`Entity ${id} not found`);
  });
}

export const fetchUser = async (id: UserId): Promise<User> => {
  // simulate an API failure, such as Connectivity issue
  if (id === 'u-9999') {
    throw new ConnectionError('SDK Failure: fetch user');
  }

  const user = users.find(u => u.id === id);
  if (!user) throw new Error(`User ${id} not found`);
  return new User(user);
}

export const isUserAllowedForEntity = async (user: User, entity: Entity): Promise<boolean> => {
  try {
    return !entity.restrictions.includes(user.country);
  } catch (e) {
    throw e;
  }
}
