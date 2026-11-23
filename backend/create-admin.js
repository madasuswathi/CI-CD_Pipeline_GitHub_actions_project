
require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function createAdmin() {
    try {
        const password = await bcrypt.hash("Admin@12345", 10);

        await db.query(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, 'admin')
             ON DUPLICATE KEY UPDATE role = 'admin'`,
            ["FarmFresh Admin", "admin@farmfresh.com", password]
        );

        console.log("Admin account created successfully");
        console.log("Email: admin@farmfresh.com");
        console.log("Password: Admin@12345");

    } catch (error) {
        console.error(error);
    } finally {
        await db.end();
    }
}

createAdmin();
