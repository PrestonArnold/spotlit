import { app } from './server.js';

import interviewRouter from './routes/interview.js';

app.use('/interview', interviewRouter)

app.listen(3002, () => console.log('running on port 3002'))