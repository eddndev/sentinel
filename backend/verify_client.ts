import { describe, expect, test } from "bun:test";

const BASE_URL = "http://localhost:8081";

const testClient = {
    email: `test_${Date.now()}@example.com`,
    phoneNumber: "1234567890",
    name: "Test Client",
    plainTextPassword: "superSecretPassword123",
    captureLine: "12345678901234567890",
    contactNumber: "0987654321"
};

let clientId = "";

console.log("Starting Client API Verification...");

try {
    // 1. Create Client
    console.log("Creating client...");
    const createRes = await fetch(`${BASE_URL}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testClient)
    });

    if (!createRes.ok) {
        console.error("Create failed:", await createRes.text());
        process.exit(1);
    }

    const created = await createRes.json();
    console.log("Client created:", created.id);
    clientId = created.id;

    if (created.plainTextPassword || created.encryptedPassword) {
        console.error("FAIL: Pulse returned password fields!");
        process.exit(1);
    }

    // 2. Get Client (Regular)
    console.log("Fetching client...");
    const getRes = await fetch(`${BASE_URL}/clients/${clientId}`);
    const fetched = await getRes.json();

    if (fetched.plainTextPassword) {
        console.error("FAIL: Normal GET returned plainTextPassword!");
        process.exit(1);
    }

    // 3. Get Client (Reveal)
    console.log("Fetching client with reveal...");
    const revealRes = await fetch(`${BASE_URL}/clients/${clientId}?reveal=true`);
    const revealed = await revealRes.json();

    if (revealed.plainTextPassword !== testClient.plainTextPassword) {
        console.error(`FAIL: Revealed password mismatch! Expected '${testClient.plainTextPassword}', got '${revealed.plainTextPassword}'`);
        process.exit(1);
    }

    console.log("SUCCESS: Password encryption and retrieval verified!");

} catch (e) {
    console.error("Verification script error:", e);
    process.exit(1);
}
