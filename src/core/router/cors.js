
import cors from 'cors';

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

export const configureCors = () => {
  return cors(corsOptions);
};