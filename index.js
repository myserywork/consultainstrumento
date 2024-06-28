
import dotenv from 'dotenv';
import { router, logger  } from './src/di.js';
import consultarInstrumento from './src/transferegov/consultarInstrumento.js';
import  { consultarEntidade }  from './src/transferegov/consultarEntidade.js';
import { hello } from './hello.js';

dotenv.config();
const PORT = process.env.PORT || 3000;


router.start(PORT).then(() => {
    logger.success(`Server listening on port ${PORT}`);
    router.configureMiddleware();
}).catch((error) => {
    logger.error(error);
});


router.getRouter().get('/consultarInstrumento', consultarInstrumento);
router.getRouter().post('/consultarEntidade', consultarEntidade);


hello(); 