import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import { pool } from "../initDB.js";

/**
 * 1) Solo valida el token de Firebase. No toca la DB.
 *    Usalo solo en la ruta donde llamas a createUserIfNotExists.
 */
export async function verifyFirebaseToken(req, res, next) {
  try {
    let decoded;

    if (process.env.MOCK_AUTH === "true" && process.env.NODE_ENV !== "production") {
      decoded = { uid: "mock-uid-123", email: "mock@test.local", name: "Usuario De Prueba" };
    } else {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token no proporcionado" });
      }
      const token = authHeader.split("Bearer ")[1];
      decoded = await getAuth(app).verifyIdToken(token);
    }

    const [firstName, ...rest] = (decoded.name ?? "").trim().split(/\s+/);

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      firstName: (firstName || "Usuario").slice(0, 100),
      lastName: rest.join(" ").slice(0, 150),
    };

    next();
  } catch (error) {
    console.error("Error en verifyFirebaseToken:", error);
    return res.status(401).json({ error: "Token inválido" });
  }
}

/**
 * 2) Traduce uid de Firebase -> id (UUID) de tu tabla users.
 *    Solo lectura: NO crea usuarios. Usalo en todas las demás rutas,
 *    después de verifyFirebaseToken.
 */
export async function attachUser(req, res, next) {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE firebase_uid = $1",
      [req.user.uid]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        error: "Usuario no registrado",
        code: "USER_NOT_REGISTERED",
      });
    }

    req.user.id = rows[0].id;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Acceso restringido a administradores" });
  }
  next();
}

export const requireUser = [verifyFirebaseToken, attachUser];