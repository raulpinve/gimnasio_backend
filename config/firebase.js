import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import credentials from "../firebase-credentials.json" with { type: "json" };

const app = initializeApp({
  credential: cert(credentials),
});

export const messaging = getMessaging(app);
export { app }; 