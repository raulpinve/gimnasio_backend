import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";

export async function verifyFirebaseToken(req, res, next) {
  try {
    if (process.env.MOCK_AUTH === "true") {
      req.user = { uid: "mock-uid-123", firstName: "Usuario", lastName: "De Prueba" };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth(app).verifyIdToken(token);

    const fullName = decodedToken.name ?? "";
    const [firstName, ...rest] = fullName.trim().split(/\s+/);

    req.user = {
      uid: decodedToken.uid,
      firstName: (firstName || "Usuario").slice(0, 100),
      lastName: rest.join(" ").slice(0, 150) || null,
    };

    next();
  } catch (error) {
    console.error("Error en verifyFirebaseToken:", error);
    return res.status(401).json({ error: "Token inválido" });
  }
}