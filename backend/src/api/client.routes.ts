import { Elysia } from "elysia";
import { ClientController } from "./client.controller";

export const clientRoutes = new Elysia({ prefix: "/clients" })
    .get("/", ClientController.getAll)
    .post("/", ClientController.create)
    .get("/:id", ClientController.getOne)
    .put("/:id", ClientController.update)
    .delete("/:id", ClientController.delete);
