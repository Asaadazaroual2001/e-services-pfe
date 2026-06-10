import { updateMyProfile } from "./auth";

/** Profil client : même API que l’admin (PUT /api/me). */
export async function updateClientProfile(payload) {
  return updateMyProfile(payload);
}
