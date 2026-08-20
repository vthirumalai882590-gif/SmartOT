import { db } from '../database/db';
import { User } from '../../../shared/src/types';

export class UserRepository {
  findAll(): User[] {
    return db.getData().users;
  }

  findById(id: string): User | undefined {
    return db.getData().users.find((u) => u.id === id);
  }

  findByEmail(email: string): User | undefined {
    if (!email || typeof email !== 'string') return undefined;
    const clean = email.trim().toLowerCase();
    return db.getData().users.find((u) => u.email && u.email.toLowerCase() === clean);
  }

  create(user: User): User {
    const data = db.getData();
    data.users.push(user);
    db.persist();
    return user;
  }
}

export const userRepository = new UserRepository();
