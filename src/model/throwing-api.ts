import { entities } from './entity.data';
import { Entity, User } from './types';
import { users } from './user.data';

export const fetchEntity = async (id: number): Promise<Entity> => {
  const entity = entities.find(e => e.id === id);
  if (!entity) throw new Error(`Entity ${id} not found`);
  return new Entity(entity);
}

export const fetchUser = async (id: number): Promise<User> => {
  const user = users.find(u => u.id === id);
  if (!user) throw new Error(`User ${id} not found`);
  return new User(user);
}
