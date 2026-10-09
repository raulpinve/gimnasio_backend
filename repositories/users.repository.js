import camelcaseKeys from "camelcase-keys";
import { pool } from "../initDB.js";

/**
 * Finds a user by their firebase_uid.
 * Returns null if the user does not exist.
 */
export async function findByFirebaseUid(firebaseUid) {
  const { rows } = await pool.query(
    `SELECT
       id,
       firebase_uid,
       first_name,
       last_name,
       username,
       email,
       avatar,
       avatar_thumbnail,
       created_at
     FROM users
     WHERE firebase_uid = $1`,
    [firebaseUid]
  );

  return rows[0] ? camelcaseKeys(rows[0]) : null;
}

/**
 * Updates one or more profile fields for a user, identified by firebase_uid.
 * Accepts: { firstName, lastName, username, avatar, avatarThumbnail }
 * Returns the updated user, or null if the user does not exist.
 *
 * Note: if `username` is already taken, Postgres throws a unique violation
 * (error.code === "23505") that the caller should handle (e.g. HTTP 409).
 */
export async function updateUserProfile(firebaseUid, fields) {
  const columnMap = {
    firstName: "first_name",
    lastName: "last_name",
    username: "username",
    avatar: "avatar",
    avatarThumbnail: "avatar_thumbnail",
  };

  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(fields)) {
    const column = columnMap[key];
    if (!column || value === undefined) continue;
    setClauses.push(`${column} = $${++i}`);
    values.push(value);
  }

  // Nothing to update: just return the current user
  if (setClauses.length === 0) {
    return findByFirebaseUid(firebaseUid);
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET ${setClauses.join(", ")}
     WHERE firebase_uid = $1
     RETURNING
       id,
       firebase_uid,
       first_name,
       last_name,
       username,
       email,
       avatar,
       avatar_thumbnail,
       created_at`,
    [firebaseUid, ...values]
  );

  return rows[0] ? camelcaseKeys(rows[0]) : null;
}

/**
 * Creates a user if it doesn't already exist (idempotent).
 * Used in the post-login sync flow.
 * `email` is required by the schema (NOT NULL); take it from the Firebase token.
 * `username` stays NULL until the user chooses one in the app.
 */
export async function createUserIfNotExists(
  firebaseUid,
  email,
  firstName,
  lastName
) {
  await pool.query(
    `INSERT INTO users (firebase_uid, email, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (firebase_uid) DO NOTHING`,
    [firebaseUid, email, firstName, lastName]
  );
}

/**
 * Total number of finished workouts for a user (by internal user id).
 */
export async function countCompletedWorkouts(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total
     FROM workouts
     WHERE user_id = $1 AND finished_at IS NOT NULL`,
    [userId]
  );

  return parseInt(rows[0].total, 10);
}

/**
 * Current streak: consecutive days with a finished workout, counting
 * backwards from today or yesterday. Returns 0 if there is no active streak.
 */
export async function getCurrentStreak(userId) {
  const { rows } = await pool.query(
    `WITH RECURSIVE dates AS (
        SELECT CAST(finished_at AS DATE) AS workout_date
        FROM workouts
        WHERE user_id = $1 AND finished_at IS NOT NULL
        GROUP BY workout_date
     ),
     streak_calc AS (
        -- Empezamos desde el último entrenamiento (si fue hoy o ayer)
        SELECT workout_date, 1 AS day_count
        FROM dates
        WHERE workout_date >= CURRENT_DATE - INTERVAL '1 day'

        UNION ALL

        -- Vamos uniendo los días anteriores consecutivos
        SELECT d.workout_date, s.day_count + 1
        FROM dates d
        INNER JOIN streak_calc s ON d.workout_date = s.workout_date - INTERVAL '1 day'
     )
     SELECT COALESCE(MAX(day_count), 0) AS current_streak FROM streak_calc`,
    [userId]
  );

  return parseInt(rows[0].current_streak, 10);
}