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
        .derive(async ({ jwt, cookie: { auth_token }, headers: { authorization }, set }) => {
            let tokenValue = auth_token?.value;

            // Check Bearer token in headers if no cookie
            if (!tokenValue && authorization) {
                const parts = authorization.split(' ');
                if (parts.length === 2 && parts[0] === 'Bearer') {
                    tokenValue = parts[1];
                }
            }

            if (!tokenValue) {
                return { user: null };
            }

            const profile = await jwt.verify(tokenValue);
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
            }
        }));
