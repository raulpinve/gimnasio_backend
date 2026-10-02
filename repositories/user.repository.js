import camelcaseKeys from "camelcase-keys";
import { pool } from "../init.db.js";

/**
 * Finds a user by their firebase_uid.
 */
export async function findByFirebaseUid(firebaseUid) {
  const { rows } = await pool.query(
    `SELECT
       u.id,
       u.firebase_uid,
       u.first_name,
       u.last_name,
       u.registered_at,
       st.id AS skin_type_id,
       st.scale AS skin_type_scale,
       st.name AS skin_type_name,
       st.description AS skin_type_description,
       st.med_j_m2 AS skin_type_med_j_m2
     FROM users u
     LEFT JOIN skin_types st ON st.id = u.skin_type_id
     WHERE u.firebase_uid = $1`,
    [firebaseUid]
  );

  if (!rows[0]) return null;

  const row = camelcaseKeys(rows[0]);

  const {
    skinTypeId,
    skinTypeScale,
    skinTypeName,
    skinTypeDescription,
    skinTypeMedJM2,
    ...user
  } = row;

  return {
    ...user,
    skinType: skinTypeId
      ? {
          id: skinTypeId,
          scale: skinTypeScale,
          name: skinTypeName,
          description: skinTypeDescription,
          medJm2: skinTypeMedJM2,
        }
      : null,
  };
}

/**
 * Updates one or more profile fields for a user, identified by firebase_uid.
 * Accepts: { firstName, lastName, skinTypeId }
 * Returns the updated user, or null if the user does not exist.
 */
export async function updateUserProfile(firebaseUid, fields) {
  const columnMap = {
    firstName: "first_name",
    lastName: "last_name",
    skinTypeId: "skin_type_id",
  };

  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(fields)) {
    const column = columnMap[key];
    if (!column) continue;
    setClauses.push(`${column} = $${++i}`);
    values.push(value);
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET ${setClauses.join(", ")}
     WHERE firebase_uid = $1
     RETURNING id, firebase_uid, first_name, last_name, skin_type_id`,
    [firebaseUid, ...values]
  );

  return rows[0] ? camelcaseKeys(rows[0]) : null;
}

/**
 * Creates a user if it doesn't already exist (idempotente).
 * Se usa en el flujo de sincronización post-login.
 */
export async function createUserIfNotExists(firebaseUid, firstName, lastName) {
  await pool.query(
    `INSERT INTO users (firebase_uid, first_name, last_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO NOTHING`,
    [firebaseUid, firstName, lastName]
  );
}