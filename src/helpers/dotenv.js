
import dotenv from 'dotenv';

class EnvManager {
  constructor() {
    dotenv.config();
  }

  get(key) {
    return process.env[key];
  }

  set(key, value) {
    process.env[key] = value;
  }

  unset(key) {
    delete process.env[key];
  }

  getAll() {
    return { ...process.env };
  }

}

export default EnvManager;