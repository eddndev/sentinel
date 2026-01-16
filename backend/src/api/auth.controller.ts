import { Elysia, t } from "elysia";
import { AuthService } from "../services/auth.service";
import { authMiddleware } from "../middleware/auth.middleware";

export const authController = new Elysia({ prefix: "/auth" })
    .use(authMiddleware)
    .post("/login", async ({ body, jwt, set }) => {
        try {
            const { email, password } = body as any;

            const user = await AuthService.validateUser(email, password);

            if (!user) {
                set.status = 401;
                return { error: "Invalid credentials" };
            }

            const token = await jwt.sign({
                id: user.id,
                email: user.email,
                role: "ADMIN" // Simplified role for now
            });

            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName
                }
            };
        } catch (error) {
            console.error("Login Error:", error);
            set.status = 500;
            return { error: "Internal Server Error" };
        }
    })
    .post("/logout", ({ cookie: { auth_token } }) => {
        auth_token.remove();
        return { success: true };
    })
    .get("/me", ({ user }) => {
        return {
            id: user!.id,
            email: user!.email,
            role: user!.role,
            fullName: user!.fullName
        };
    }, {
        isSignIn: true // Uses our macro
    });
