import db from './db.js';
import bcrypt from 'bcrypt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function migratePasswords() {
    console.log("Starting Password Migration (Hashing)...");
    await wait(1000); // Wait for DB init

    // 1. Fetch all users
    db.all("SELECT * FROM users", [], async (err, users) => {
        if (err) {
            console.error("Error fetching users:", err);
            process.exit(1);
        }

        console.log(`Found ${users.length} users. Checking passwords...`);
        let updatedCount = 0;

        for (const user of users) {
            // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
            if (user.password && !user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
                console.log(`Hashing password for user: ${user.username}`);

                const hashedPassword = await bcrypt.hash(user.password, 10);

                await new Promise((resolve) => {
                    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id], (updErr) => {
                        if (updErr) console.error(`Failed to update user ${user.username}:`, updErr);
                        else updatedCount++;
                        resolve();
                    });
                });
            } else {
                console.log(`User ${user.username} already has hashed password.`);
            }
        }

        console.log(`Migration Completed. Updated ${updatedCount} users.`);
        process.exit(0);
    });
}

migratePasswords();
