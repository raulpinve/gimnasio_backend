\c postgres

DROP DATABASE IF EXISTS fitness;
CREATE DATABASE fitness;

\c fitness;

-- =========================
-- USERS
-- =========================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    avatar TEXT,
    avatar_thumbnail TEXT,
    reset_token TEXT,
    reset_token_expiration TIMESTAMPTZ
);

-- =========================
-- EXERCISES
-- =========================
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'strength' CHECK (type IN ('strength', 'cardio')),
    
    -- Cambio clave: Ahora es un ARRAY de texto para soportar varios músculos
    muscle_groups TEXT[] NOT NULL DEFAULT '{}',
    
    equipment TEXT DEFAULT 'ninguno' CHECK (equipment IN (
        'barras', 'mancuernas', 'maquinas', 'poleas', 'banco',
        'peso_corporal', 'bandas', 'kettlebells', 'ninguno'
    )),
    
    description TEXT, -- Aquí guardamos el formato "Posición | Ejecución"
    avatar TEXT,
    avatar_thumbnail TEXT, 
    video TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Nueva Restricción para validar que todos los elementos del array sean válidos
    CONSTRAINT exercises_muscle_groups_check CHECK (
        muscle_groups <@ ARRAY[
            'pecho', 'espalda', 'lumbares', 'hombros', 'biceps', 'triceps', 
            'antebrazos', 'cuadriceps', 'isquios', 'gluteos', 
            'gemelos', 'aductores', 'abs', 'cardio', 'full_body'
        ]::text[]
    )
);

-- =========================
-- ROUTINES (templates)
-- =========================
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    name TEXT NOT NULL
);

CREATE UNIQUE INDEX unique_routine_name
ON routines (LOWER(name));

-- =========================
-- ROUTINE EXERCISES (template)
-- =========================
CREATE TABLE routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    target_sets INT,
    target_reps INT,
    target_weight NUMERIC, 
    target_duration_seconds INT,
    target_distance_km NUMERIC,
    CONSTRAINT unique_routine_exercise UNIQUE (routine_id, exercise_id)
);

-- =========================
-- WORKOUTS (sesión real)
-- =========================
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100), 
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES routines(id),
    started_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP
);


-- =========================
-- WORKOUT EXERCISES
-- =========================
CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_workout_exercise UNIQUE (workout_id, exercise_id)
);

-- =========================
-- WORKOUT SETS
-- =========================
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,
    rpe INT,
    set_number INT NOT NULL,
    reps INT NOT NULL,
    weight_unit VARCHAR(5) DEFAULT 'kg',
    weight NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workout_exercise_id, set_number)
);

-- =========================
-- CARDIO LOGS
-- =========================
CREATE TABLE cardio_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,

    duration_seconds INT NOT NULL,
    distance_km NUMERIC,
    calories INT,
    avg_heart_rate INT,

    created_at TIMESTAMP DEFAULT NOW()
);