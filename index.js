import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';

import { fileURLToPath } from 'url';
import { initDB } from './initDB.js';

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
import profileRoutes from './routes/profiles.routes.js';
import programTemplatesRouter from './routes/programTemplates.routes.js';
import programTemplatesAdminRouter from './routes/programTemplates.admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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
app.use('/api/uploads', express.static( path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/routine-exercises', routineExercisesRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/workouts-exercises', workoutsExercises);
app.use('/api/workout-sets', workoutSetsRoutes);
app.use('/api/cardio-logs', cardioLogsRoutes);
app.use('/api/users', userRoutes);

// Es el perfil de entrenamiento del usuario logueado (sus respuestas del onboarding). 
// Está abierto a cualquier usuario autenticado.
app.use('/api/profiles', profileRoutes) 
// Es el catálogo de programas, visto desde el lado del usuario. Cualquier usuario autenticado puede 
// verlos y elegir uno. No puede crear, editar ni borrar.
app.use('/api/program-templates', programTemplatesRouter); 
// Es la gestión de programas, solo para admins (role = 'admin').
app.use('/api/admin/program-templates', programTemplatesAdminRouter); 

app.use(handleErrorResponse);
const port = process.env.PORT || 5000;

(async () => {
    await initDB();
    app.listen(port, '0.0.0.0', () => {
        console.log(`Servidor escuchando en http://localhost:${port}`);
    });
})();

export default app;