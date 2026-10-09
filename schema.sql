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
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    reset_token TEXT,
    reset_token_expiration TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- USER PROFILES (onboarding)
-- =========================
-- Preferencias de entrenamiento. Una fila por usuario.
-- Se usa para elegir qué programa prediseñado recibe.
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    goal TEXT NOT NULL CHECK (goal IN (
        'hipertrofia', 'perdida_grasa', 'fuerza', 'salud_general'
    )),
    experience TEXT NOT NULL DEFAULT 'principiante'
        CHECK (experience IN ('principiante', 'intermedio', 'avanzado')),
    days_per_week INT CHECK (days_per_week BETWEEN 1 AND 7),
    session_minutes INT,
    available_equipment TEXT[] NOT NULL DEFAULT '{}',   -- mismos valores que exercises.equipment
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
-- PROGRAM TEMPLATES (programas prediseñados, los creas tú)
-- =========================
-- Ficha general del programa
CREATE TABLE program_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    goal TEXT NOT NULL CHECK (goal IN (
        'hipertrofia', 'perdida_grasa', 'fuerza', 'salud_general'
    )),
    experience TEXT NOT NULL DEFAULT 'principiante'
        CHECK (experience IN ('principiante', 'intermedio', 'avanzado')),
    days_per_week INT NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
    required_equipment TEXT[] NOT NULL DEFAULT '{}',    -- equipo mínimo para poder hacerlo
    description TEXT
);

-- Rutinas del programa (equivale a una fila de routines)
CREATE TABLE program_template_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
    order_index INT NOT NULL,                           -- orden dentro del programa
    name TEXT NOT NULL,                                 -- "Día 1 - Full body A"
    UNIQUE (template_id, order_index)
);

-- Ejercicios de cada rutina del programa (equivale a routine_exercises)
CREATE TABLE program_template_routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_routine_id UUID NOT NULL REFERENCES program_template_routines(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    target_sets INT,
    target_reps INT,
    target_weight NUMERIC,              -- normalmente NULL en principiantes
    target_duration_seconds INT,        -- cardio
    target_distance_km NUMERIC,
    UNIQUE (template_routine_id, exercise_id)
);

-- =========================
-- ROUTINES (rutinas del usuario)
-- =========================
-- source = 'manual'    -> la creó el usuario
-- source = 'generated' -> la creó la app a partir de un program_template
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'generated')),
    template_id UUID REFERENCES program_templates(id) ON DELETE SET NULL
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
CREATE INDEX idx_routines_template          ON routines (template_id);
CREATE INDEX idx_routine_exercises_exercise ON routine_exercises (exercise_id);
CREATE INDEX idx_workouts_user_started      ON workouts (user_id, started_at DESC);
CREATE INDEX idx_workouts_routine           ON workouts (routine_id);
CREATE INDEX idx_workout_exercises_workout  ON workout_exercises (workout_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises (exercise_id);
CREATE INDEX idx_cardio_logs_workout_ex     ON cardio_logs (workout_exercise_id);
CREATE INDEX idx_exercises_muscle_groups    ON exercises USING GIN (muscle_groups);

CREATE INDEX idx_ptr_template               ON program_template_routines (template_id);
CREATE INDEX idx_ptre_exercise              ON program_template_routine_exercises (exercise_id);
CREATE INDEX idx_program_templates_match    ON program_templates (goal, experience);

-- =========================
-- FUNCIÓN: asignar un programa a un usuario
-- =========================
-- Copia las rutinas y ejercicios de una plantilla a las tablas del usuario.
-- Uso: SELECT * FROM assign_template_to_user('<user_id>', '<template_id>');
-- Si el usuario ya tiene una rutina con el mismo nombre, esa se omite.
CREATE OR REPLACE FUNCTION assign_template_to_user(p_user_id UUID, p_template_id UUID)
RETURNS SETOF routines AS $$
DECLARE
    r program_template_routines%ROWTYPE;
    new_routine_id UUID;
BEGIN
    FOR r IN SELECT * FROM program_template_routines
             WHERE template_id = p_template_id ORDER BY order_index
    LOOP
        new_routine_id := NULL;

        INSERT INTO routines (user_id, name, source, template_id)
        VALUES (p_user_id, r.name, 'generated', p_template_id)
        ON CONFLICT (user_id, LOWER(name)) DO NOTHING
        RETURNING id INTO new_routine_id;

        IF new_routine_id IS NOT NULL THEN
            INSERT INTO routine_exercises
                (routine_id, exercise_id, order_index, target_sets, target_reps,
                 target_weight, target_duration_seconds, target_distance_km)
            SELECT new_routine_id, exercise_id, order_index, target_sets, target_reps,
                   target_weight, target_duration_seconds, target_distance_km
            FROM program_template_routine_exercises
            WHERE template_routine_id = r.id;
        END IF;
    END LOOP;

    RETURN QUERY SELECT * FROM routines
                 WHERE user_id = p_user_id AND template_id = p_template_id;
END;
$$ LANGUAGE plpgsql;