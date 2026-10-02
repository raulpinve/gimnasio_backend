\c postgres

DROP DATABASE IF EXISTS fitness;
CREATE DATABASE fitness;

\c fitness;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- USERS
-- =========================
-- Login gestionado por Firebase:
--   * firebase_uid enlaza con la cuenta de Firebase
--   * password y username son opcionales (el username se elige después en la app)
--   * UNIQUE permite varios NULL en username, así que no hay conflicto
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username VARCHAR(50) UNIQUE,
    password TEXT,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar TEXT,
    avatar_thumbnail TEXT,
    reset_token TEXT,
    reset_token_expiration TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- EXERCISES
-- =========================
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'strength'
        CHECK (type IN ('strength', 'cardio')),

    muscle_groups TEXT[] NOT NULL DEFAULT '{}',

    equipment TEXT DEFAULT 'ninguno' CHECK (equipment IN (
        'barras', 'mancuernas', 'maquinas', 'poleas', 'banco',
        'peso_corporal', 'bandas', 'kettlebells', 'ninguno'
    )),

    description TEXT,           -- formato "Posición | Ejecución"
    avatar TEXT,
    avatar_thumbnail TEXT,
    video TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT exercises_muscle_groups_check CHECK (
        muscle_groups <@ ARRAY[
            'pecho', 'espalda', 'lumbares', 'hombros', 'biceps', 'triceps',
            'antebrazos', 'cuadriceps', 'isquios', 'gluteos',
            'gemelos', 'aductores', 'abs', 'cardio', 'full_body'
        ]::text[]
    )
);

-- =========================
-- ROUTINES (plantillas)
-- =========================
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    name TEXT NOT NULL
);

-- El nombre único es POR USUARIO (antes era global entre todos los usuarios)
CREATE UNIQUE INDEX unique_routine_name_per_user
    ON routines (user_id, LOWER(name));

-- =========================
-- ROUTINE EXERCISES (plantilla)
-- =========================
CREATE TABLE routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INT,
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
-- Si se borra la rutina, el entreno se conserva (routine_id = NULL)
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- =========================
-- WORKOUT EXERCISES
-- =========================
CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_workout_exercise UNIQUE (workout_id, exercise_id)
);

-- =========================
-- WORKOUT SETS (fuerza)
-- =========================
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INT NOT NULL CHECK (set_number > 0),
    reps INT NOT NULL CHECK (reps >= 0),
    weight NUMERIC NOT NULL CHECK (weight >= 0),
    weight_unit VARCHAR(5) DEFAULT 'kg',
    rpe INT CHECK (rpe BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workout_exercise_id, set_number)
);

-- =========================
-- CARDIO LOGS
-- =========================
CREATE TABLE cardio_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,
    duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
    distance_km NUMERIC,
    calories INT,
    avg_heart_rate INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- INDEXES (claves foráneas y consultas frecuentes)
-- =========================
CREATE INDEX idx_routines_user              ON routines (user_id);
CREATE INDEX idx_routine_exercises_exercise ON routine_exercises (exercise_id);
CREATE INDEX idx_workouts_user_started      ON workouts (user_id, started_at DESC);
CREATE INDEX idx_workouts_routine           ON workouts (routine_id);
CREATE INDEX idx_workout_exercises_workout  ON workout_exercises (workout_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises (exercise_id);
CREATE INDEX idx_cardio_logs_workout_ex     ON cardio_logs (workout_exercise_id);
CREATE INDEX idx_exercises_muscle_groups    ON exercises USING GIN (muscle_groups);