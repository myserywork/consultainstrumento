import express from 'express';
import dotenv from 'dotenv';
import { router, logger, mongoConnection } from './src/di.js';
import consultarInstrumento from './src/transferegov/consultarInstrumento.js';
import  { consultarEntidade }  from './src/transferegov/consultarEntidade.js';

dotenv.config();

const PORT = process.env.PORT || 3000;


router.start(PORT).then(() => {
    logger.success(`Server listening on port ${PORT}`);
    router.configureCors();
}).catch((error) => {
    logger.error(error);
});

router.getRouter().get('/consultarInstrumento', consultarInstrumento);
router.getRouter().post('/consultarEntidade', consultarEntidade);

const isConnected = await mongoConnection.connect();

try {
    logger.error(isConnected);
} catch (error) {
    logger.error(error);
}
