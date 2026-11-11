import { server } from './server.js';

const port = Number(process.env.PORT ?? 4173);
server.listen(port, '127.0.0.1', () => console.log(`SUN workbench listening at http://127.0.0.1:${port}`));
