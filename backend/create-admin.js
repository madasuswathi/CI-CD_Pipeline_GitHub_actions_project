
require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function createAdmin() {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            throw new Error("ADMIN_PASSWORD is not configured");
        }

        const password = await bcrypt.hash(adminPassword, 10);

        await db.query(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, 'admin')
             ON DUPLICATE KEY UPDATE role = 'admin'`,
            ["FarmFresh Admin", "admin@farmfresh.com", password]
        );

        console.log("Admin account created successfully");
        console.log("Email: admin@farmfresh.com");

    } catch (error) {
        console.error(error);
    } finally {
        await db.end();
    }
}

createAdmin().catch(error => {
    console.error("Unexpected admin creation error:", error);
    process.exitCode = 1;
});
