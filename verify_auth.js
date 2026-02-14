import fetch from 'node-fetch'; // Requires node-fetch or Node 18+

const API_URL = 'http://localhost:5000/api';

async function verifyAuth() {
    console.log("Verifying Authentication Security...");

    try {
        // 1. Create Test User
        const testUser = {
            username: `test_auth_${Date.now()}`,
            password: 'securePassword123!',
            name: 'Test Auth User',
            role: 'staff',
            department: 'IT'
        };

        console.log(`Creating test user: ${testUser.username}`);
        const createRes = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        if (!createRes.ok) {
            throw new Error(`Failed to create user: ${createRes.statusText}`);
        }
        console.log("User created successfully.");

        // 2. Test Login (Success)
        console.log("Testing Login with correct credentials...");
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: testUser.username, password: testUser.password })
        });

        if (!loginRes.ok) {
            const err = await loginRes.json();
            throw new Error(`Login failed (Correct Password): ${err.error}`);
        }

        const userData = await loginRes.json();
        console.log("Login successful!");

        if (userData.password) {
            console.error("CRITICAL: Login response contains password!");
            process.exit(1);
        } else {
            console.log("Verified: Login response does NOT contain password.");
        }

        // 3. Test Login (Failure)
        console.log("Testing Login with wrong password...");
        const failRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: testUser.username, password: 'wrongPassword' })
        });

        if (failRes.status === 401) {
            console.log("Verified: Login failed with 401 as expected.");
        } else {
            console.error(`Login with wrong password returned unexpected status: ${failRes.status}`);
            process.exit(1);
        }

        // 4. Verify password not in user list
        console.log("Checking GET /api/users for leaked passwords...");
        const listRes = await fetch(`${API_URL}/users`);
        const usersList = await listRes.json();

        const leakedUser = usersList.find(u => u.password);
        if (leakedUser) {
            console.error("CRITICAL: GET /api/users returned password field!");
            console.error("Leaked User:", leakedUser);
            process.exit(1);
        } else {
            console.log(`Verified: Scanned ${usersList.length} users, no passwords found.`);
        }

        console.log("\nALL SECURITY CHECKS PASSED ✅");

    } catch (err) {
        console.error("\nCheck Failed ❌");
        console.error(err);
        process.exit(1);
    }
}

verifyAuth();
