
import dotenv from 'dotenv';
import { router, logger, mongoConnection } from './di.js';
import consultarInstrumento from './transferegov/consultarInstrumento.js';
import  { consultarEntidade }  from './transferegov/consultarEntidade.js';


router.getRouter().get('/consultarInstrumento', consultarInstrumento);
router.getRouter().post('/consultarEntidade', consultarEntidade);


const isConnected = await mongoConnection.connect();

try {
    logger.error(isConnected);
} catch (error) {
    logger.error(error);
}

const routesRouterInstance = router.getRouter();

export default routesRouterInstance;