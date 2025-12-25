import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { AuthService } from "../services/auth.service";

export const authMiddleware = (app: Elysia) =>
    app
        .use(
            jwt({
                name: 'jwt',
                secret: process.env.JWT_SECRET || "DEV_SECRET_DO_NOT_USE_IN_PROOD"
            })
        )
        .derive(async ({ jwt, cookie: { auth_token }, set }) => {
            if (!auth_token?.value) {
                return { user: null };
            }

            const profile = await jwt.verify(auth_token.value);
            if (!profile) {
                return { user: null };
            }

            const user = await AuthService.getUserById(profile.id as string);
            return { user };
        })
        .macro(({ onBeforeHandle }) => ({
            isSignIn() {
                onBeforeHandle(({ user, error }) => {
                    if (!user) return error(401, "Unauthorized");
                });
            },
            hasRole(roles: string[]) {
                onBeforeHandle(({ user, error }) => {
                    if (!user) return error(401, "Unauthorized");
                    if (!roles.includes(user.role)) return error(403, "Forbidden");
                });
            }
        }));
