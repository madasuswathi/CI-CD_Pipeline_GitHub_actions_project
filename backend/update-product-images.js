
require("dotenv").config();

const mysql = require("mysql2/promise");

async function updateImages() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("Database connected successfully.");

        const [products] = await connection.execute(
            "SELECT id, name FROM products ORDER BY id"
        );

        console.log(`Total products found: ${products.length}`);

        await connection.beginTransaction();

        for (const product of products) {
            const image = `/images/products/product-${String(product.id).padStart(2, "0")}.jpg`;

            await connection.execute(
                "UPDATE products SET image = ? WHERE id = ?",
                [image, product.id]
            );

            console.log(`${product.id}. ${product.name} -> ${image}`);
        }

        await connection.commit();

        console.log("All product image paths updated successfully.");

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Image update failed:", error.message);

    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateImages();

