import { findByFirebaseUid, createUserIfNotExists } from "../repositories/user.repository.js";
import { successResponse } from "../utils/response.utils.js";

export async function syncUser(req, res, next) {
  try {
    const { uid, email, firstName, lastName } = req.user;

    if (!email) {
      return res.status(400).json({ error: "La cuenta no tiene email asociado" });
    }

    await createUserIfNotExists(uid, email, firstName, lastName);
    const user = await findByFirebaseUid(uid);

    return successResponse(res, 200, "Usuario sincronizado correctamente", user);
  } catch (error) {
    // 23505 = unique_violation: ese email ya pertenece a otro usuario
    if (error.code === "23505") {
      return res.status(409).json({ error: "El email ya está registrado con otra cuenta" });
    }
    next(error);
  }
}