import { logger } from '../../di.js';
import express from 'express';
import { configureCors } from './cors.js';
const appRouter = express();

class Router {
  constructor() {
    this.appRouter = appRouter;
    this.configureMiddleware();
  }

  configureMiddleware() {
    try {
      this.appRouter.use(express.json()); // Add JSON parser middleware
      this.appRouter.use(configureCors());
      logger.info('Middleware configured');
    } catch (error) {
      logger.error(error);
    }
  }

  getRouter() {
    return this.appRouter;
  }

  start(port) {
    return new Promise((resolve, reject) => {
      try {
        this.appRouter.listen(port, () => {
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default Router;

// Path: src/core/router/index.js
