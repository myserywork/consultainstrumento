import Logger from './helpers/logger.js';
import Router from './core/router/index.js';
import EnvManager from './helpers/dotenv.js';
import Request from './helpers/request.js';
import OpenAIAssistant from './helpers/openai.js';
import MongoConnection from './core/database/connection.js';
import mongoose from 'mongoose';
import { UserSchema } from './core/models/User.js';
import { ConvenioSchema } from './core/models/Convenio.js';
import { InstrumentoSchema } from './core/models/Instrumento.js';

const loggerTemp = new Logger();

class DIContainer {

    constructor() {
        this.dependencies = new Map();
    }

    register(name, dependency) {
        loggerTemp.info(`Dependency registered: ${name}`);
        this.dependencies.set(name, dependency);
    }

    resolve(name) {
        if (!this.dependencies.has(name)) {
            throw new Error(`Dependency '${name}' not registered.`);
        }
        return this.dependencies.get(name);
    }
    
}

const container = new DIContainer();

/* helpers */
container.register('logger', new Logger());
export const logger = container.resolve('logger');

container.register('envManager', new EnvManager());
export const envManager = container.resolve('envManager');

container.register('request', new Request());
export const request = container.resolve('request');

container.register('openai', new OpenAIAssistant());
export const openai = container.resolve('openai');

/* core */
container.register('router', new Router());
export const router = container.resolve('router');

// database & models
container.register('mongoConnection', new MongoConnection(envManager.get('MONGO_URI')));
export const mongoConnection = container.resolve('mongoConnection');

export const UserModel = mongoose.model('User', UserSchema);
export const ConvenioModel = mongoose.model('Convenio', ConvenioSchema);
export const InstrumentoModel = mongoose.model('Instrumento', InstrumentoSchema);
