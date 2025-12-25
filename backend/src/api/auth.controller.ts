import { Elysia, t } from "elysia";
import { AuthService } from "../services/auth.service";
import { authMiddleware } from "../middleware/auth.middleware";

export const authController = new Elysia({ prefix: "/api/auth" })
    .use(authMiddleware)
    .post("/login", async ({ body, jwt, cookie: { auth_token }, error }) => {
        const { email, password } = body;
        const user = await AuthService.validateUser(email, password);

        if (!user) {
            return error(401, "Invalid credentials");
        }

        // Generate Token
        auth_token.set({
            value: await jwt.sign({ id: user.id, role: user.role }),
            httpOnly: true,
            maxAge: 7 * 86400, // 7 Days
            path: "/"
        });

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                fullName: user.fullName
            }
        };
    }, {
        body: t.Object({
            email: t.String(),
            password: t.String()
        })
    })
    .post("/logout", ({ cookie: { auth_token } }) => {
        auth_token.remove();
        return { success: true };
    })
    .get("/me", ({ user, error }) => {
        if (!user) return error(401, "Not authenticated");
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName
        };
    }, {
        isSignIn: true // Uses our macro
    });
