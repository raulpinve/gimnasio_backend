import { findByFirebaseUid, createUserIfNotExists } from "../repositories/user.repository.js";
import { successResponse } from "../utils/response.utils.js";

export async function syncUser(req, res) {
  const { uid, firstName, lastName } = req.user;

  await createUserIfNotExists(uid, firstName, lastName);

  const user = await findByFirebaseUid(uid);

  return successResponse(res, 200, "Usuario sincronizado correctamente", user);
}