
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const db = require("./config/db");

const app = express();

app.disable("x-powered-by");

const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    "http://localhost:5000,http://localhost:5001"
)
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const PORT = process.env.PORT || 5000;

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access token required"
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: "Invalid or expired token"
            });
        }

        req.user = user;
        next();
    });
}

// Admin middleware
function adminOnly(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access required"
        });
    }

    next();
}

// Health API
app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.json({
            status: "UP",
            application: "FarmFresh",
            database: "Connected"
        });
    } catch (error) {
        res.status(500).json({
            status: "DOWN",
            database: "Disconnected"
        });
    }
});

// Homepage
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/index.html")
    );
});

// Get categories
app.get("/api/categories", async (req, res) => {
    try {
        const [categories] = await db.query(
            "SELECT * FROM categories ORDER BY name"
        );

        res.json(categories);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch categories"
        });
    }
});

// Get all products
app.get("/api/products", async (req, res) => {
    try {
        const search = req.query.search || "";
        const category = req.query.category || "";

        let sql = `
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.name LIKE ?
        `;

        const params = [`%${search}%`];

        if (category) {
            sql += " AND c.slug = ?";
            params.push(category);
        }

        sql += " ORDER BY p.featured DESC, p.id DESC";

        const [products] = await db.query(sql, params);

        res.json(products);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch products"
        });
    }
});

// Get one product
app.get("/api/products/:id", async (req, res) => {
    try {
        const [products] = await db.query(
            "SELECT * FROM products WHERE id = ?",
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(products[0]);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch product"
        });
    }
});

// Customer registration
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters"
            });
        }

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users (name, email, password)
             VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "Registration successful",
            userId: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});

// Get cart
app.get("/api/cart", authenticateToken, async (req, res) => {
    try {
        const [cart] = await db.query(
            `SELECT c.id, c.quantity,
                    p.id AS product_id,
                    p.name, p.price, p.image,
                    (p.price * c.quantity) AS subtotal
             FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ?`,
            [req.user.id]
        );

        res.json(cart);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch cart"
        });
    }
});

// Add to cart
app.post("/api/cart", authenticateToken, async (req, res) => {
    try {
        const { product_id, quantity = 1 } = req.body;

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        const [products] = await db.query(
            "SELECT id, stock FROM products WHERE id = ?",
            [product_id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (products[0].stock < quantity) {
            return res.status(400).json({
                message: "Insufficient stock"
            });
        }

        await db.query(
            `INSERT INTO carts (user_id, product_id, quantity)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [req.user.id, product_id, quantity, quantity]
        );

        res.status(201).json({
            message: "Product added to cart"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to add product"
        });
    }
});

// Update cart quantity
app.put("/api/cart/:id", authenticateToken, async (req, res) => {
    try {
        const { quantity } = req.body;

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Invalid quantity"
            });
        }

        const [result] = await db.query(
            `UPDATE carts
             SET quantity = ?
             WHERE id = ? AND user_id = ?`,
            [quantity, req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Cart item not found"
            });
        }

        res.json({
            message: "Cart updated"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update cart"
        });
    }
});

// Remove cart item
app.delete("/api/cart/:id", authenticateToken, async (req, res) => {
    try {
        await db.query(
            "DELETE FROM carts WHERE id = ? AND user_id = ?",
            [req.params.id, req.user.id]
        );

        res.json({
            message: "Cart item removed"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to remove item"
        });
    }
});

// Place order
app.post("/api/orders", authenticateToken, async (req, res) => {
    const { address } = req.body;

    if (!address || !address.trim()) {
        return res.status(400).json({
            message: "Delivery address is required"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [cart] = await connection.query(
            `SELECT c.product_id, c.quantity,
                    p.price, p.stock
             FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ?
             FOR UPDATE`,
            [req.user.id]
        );

        if (cart.length === 0) {
            throw new Error("Your cart is empty");
        }

        let total = 0;

        for (const item of cart) {
            if (item.stock < item.quantity) {
                throw new Error("Insufficient product stock");
            }

            total += Number(item.price) * item.quantity;
        }

        const [orderResult] = await connection.query(
            `INSERT INTO orders (user_id, total_amount, address)
             VALUES (?, ?, ?)`,
            [req.user.id, total, address]
        );

        const orderId = orderResult.insertId;

        for (const item of cart) {
            await connection.query(
                `INSERT INTO order_items
                 (order_id, product_id, quantity, price)
                 VALUES (?, ?, ?, ?)`,
                [
                    orderId,
                    item.product_id,
                    item.quantity,
                    item.price
                ]
            );

            await connection.query(
                `UPDATE products
                 SET stock = stock - ?
                 WHERE id = ?`,
                [item.quantity, item.product_id]
            );
        }

        await connection.query(
            "DELETE FROM carts WHERE user_id = ?",
            [req.user.id]
        );

        await connection.commit();

        res.status(201).json({
            message: "Order placed successfully",
            orderId,
            total
        });
    } catch (error) {
        await connection.rollback();

        res.status(400).json({
            message: error.message || "Order placement failed"
        });
    } finally {
        connection.release();
    }
});

// Get customer orders
app.get("/api/orders", authenticateToken, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT * FROM orders
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(orders);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch orders"
        });
    }
});

// Admin: create product
app.post(
    "/api/admin/products",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        try {
            const {
                name,
                description,
                category_id,
                price,
                image,
                stock,
                featured
            } = req.body;

            if (!name || price === undefined || Number(price) <= 0) {
                return res.status(400).json({
                    message: "Valid name and price are required"
                });
            }

            const [result] = await db.query(
                `INSERT INTO products
                 (name, description, category_id, price,
                  image, stock, featured)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    name,
                    description || "",
                    category_id || null,
                    price,
                    image || "",
                    stock || 0,
                    Boolean(featured)
                ]
            );

            res.status(201).json({
                message: "Product created",
                productId: result.insertId
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to create product"
            });
        }
    }
);

// Admin: update product
app.put(
    "/api/admin/products/:id",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        try {
            const {
                name,
                description,
                category_id,
                price,
                image,
                stock,
                featured
            } = req.body;

            await db.query(
                `UPDATE products
                 SET name = ?, description = ?, category_id = ?,
                     price = ?, image = ?, stock = ?, featured = ?
                 WHERE id = ?`,
                [
                    name,
                    description,
                    category_id || null,
                    price,
                    image,
                    stock,
                    Boolean(featured),
                    req.params.id
                ]
            );

            res.json({
                message: "Product updated"
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to update product"
            });
        }
    }
);

// Admin: delete product
app.delete(
    "/api/admin/products/:id",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        try {
            await db.query(
                "DELETE FROM products WHERE id = ?",
                [req.params.id]
            );

            res.json({
                message: "Product deleted"
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to delete product"
            });
        }
    }
);

// Admin: view all orders
app.get(
    "/api/admin/orders",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        try {
            const [orders] = await db.query(
                `SELECT o.*, u.name, u.email
                 FROM orders o
                 JOIN users u ON o.user_id = u.id
                 ORDER BY o.created_at DESC`
            );

            res.json(orders);
        } catch (error) {
            res.status(500).json({
                message: "Failed to fetch admin orders"
            });
        }
    }
);


// Admin: update order status
app.put(
    "/api/admin/orders/:id/status",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        try {
            const { status } = req.body;

            const allowedStatuses = [
                "Pending",
                "Confirmed",
                "Shipped",
                "Delivered",
                "Cancelled"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid order status"
                });
            }

            const [result] = await db.query(
                "UPDATE orders SET status = ? WHERE id = ?",
                [status, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }

            res.json({
                message: "Order status updated successfully",
                status
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to update order status"
            });
        }
    }
);

// Start application
app.listen(PORT, () => {
    console.log(`FarmFresh backend running on port ${PORT}`);
});
