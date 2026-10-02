import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';

import { fileURLToPath } from 'url';
import { initDB } from './initDB.js';

import { initializeApp, cert } from 'firebase-admin/app';
import serviceAccount from './firebase-credentials.json' with { type: 'json' };

import { authenticateToken } from './controllers/auth.controller.js';
import handleErrorResponse from './errors/handleErrorResponse.js';

import authRoutes from './routes/auth.routes.js';
import exercisesRoutes from './routes/exercises.routes.js';
import routinesRoutes from './routes/routines.routes.js';
import routineExercisesRoutes from './routes/routineExercises.routes.js';
import workoutsRoutes from './routes/workouts.routes.js';
import workoutsExercises from './routes/workoutExercise.routes.js';
import workoutSetsRoutes from './routes/workoutSets.routes.js';
import cardioLogsRoutes from './routes/cardioLog.routes.js';
import userRoutes from './routes/users.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

initializeApp({
    credential: cert(serviceAccount)
});

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],
    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({
    extended: true
}));

// Archivos estáticos
app.use(
    '/api/uploads',
    express.static(
        path.join(__dirname, 'uploads')
    )
);

// Rutas públicas (Auth)
app.use('/api/auth', authRoutes);
app.use(authenticateToken);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/routine-exercises', routineExercisesRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/workouts-exercises', workoutsExercises);
app.use('/api/workout-sets', workoutSetsRoutes);
app.use('/api/cardio-logs', cardioLogsRoutes);
app.use('/api/users', userRoutes);

app.use(handleErrorResponse);
const port = process.env.PORT || 5000;

(async () => {
    await initDB();
    app.listen(port, '0.0.0.0', () => {
        console.log(`Servidor escuchando en http://localhost:${port}`);
    });
})();

export default app;