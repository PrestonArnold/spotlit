import { app } from './server.js';

import interviewRouter from './routes/interview.js';

app.use('/interview', interviewRouter);

app.listen(69420, () => console.log('running on port 69420'))
