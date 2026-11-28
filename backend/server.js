
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const db = require("./config/db");

const app = express();

app.disable("x-powered-by");
// CI/CD deployment verification test.

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

// Fetch active variants for a list of products
async function getActiveVariants(productIds) {
    if (!productIds.length) {
        return [];
    }

    const placeholders = productIds.map(() => "?").join(",");

    const [variants] = await db.query(
        `SELECT id, product_id, variant_label,
                quantity_value, unit, price, stock
         FROM product_variants
         WHERE active = 1
           AND product_id IN (${placeholders})
         ORDER BY product_id, quantity_value`,
        productIds
    );

    return variants;
}

// Get all products with active variants
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
        const variants = await getActiveVariants(
            products.map(product => product.id)
        );

        const variantsByProduct = new Map();

        for (const variant of variants) {
            if (!variantsByProduct.has(variant.product_id)) {
                variantsByProduct.set(variant.product_id, []);
            }

            variantsByProduct.get(variant.product_id).push(variant);
        }

        res.json(products.map(product => ({
            ...product,
            variants: variantsByProduct.get(product.id) || []
        })));
    } catch (error) {
        console.error("Failed to fetch products:", error.message);
        res.status(500).json({
            message: "Failed to fetch products"
        });
    }
});

// Get one product with active variants
app.get("/api/products/:id", async (req, res) => {
    try {
        const [products] = await db.query(
            `SELECT p.*, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.id = ?`,
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const variants = await getActiveVariants([products[0].id]);

        res.json({
            ...products[0],
            variants
        });
    } catch (error) {
        console.error("Failed to fetch product:", error.message);
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

// Get cart with selected variant details and shared product stock
app.get("/api/cart", authenticateToken, async (req, res) => {
    try {
        const [cart] = await db.query(
            `SELECT c.id, c.quantity,
                    p.id AS product_id,
                    p.name, p.image,
                    p.stock AS stock,
                    v.id AS variant_id,
                    v.variant_label,
                    v.price,
                    (v.price * c.quantity) AS subtotal
             FROM carts c
             JOIN products p ON c.product_id = p.id
             JOIN product_variants v ON c.variant_id = v.id
             WHERE c.user_id = ?`,
            [req.user.id]
        );

        res.json(cart);
    } catch (error) {
        console.error("Failed to fetch cart:", error.message);
        res.status(500).json({
            message: "Failed to fetch cart"
        });
    }
});

// Add selected variant using shared product stock
app.post("/api/cart", authenticateToken, async (req, res) => {
    const { variant_id, quantity = 1 } = req.body;

    if (!Number.isInteger(Number(variant_id)) ||
        Number(variant_id) < 1) {
        return res.status(400).json({
            message: "A valid product variant is required"
        });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
            message: "Quantity must be a positive integer"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [variants] = await connection.query(
            `SELECT v.id, v.product_id, p.stock AS product_stock
             FROM product_variants v
             JOIN products p ON p.id = v.product_id
             WHERE v.id = ? AND v.active = 1
             FOR UPDATE`,
            [variant_id]
        );

        if (variants.length === 0) {
            throw new Error("Product size is unavailable");
        }

        const variant = variants[0];

        const [existing] = await connection.query(
            `SELECT COALESCE(SUM(quantity), 0) AS current_quantity
             FROM carts
             WHERE user_id = ? AND product_id = ?`,
            [req.user.id, variant.product_id]
        );

        const currentQuantity = Number(existing[0].current_quantity);

        if (currentQuantity + quantity > Number(variant.product_stock)) {
            throw new Error("Insufficient stock for this product");
        }

        await connection.query(
            `INSERT INTO carts
             (user_id, product_id, variant_id, quantity)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [
                req.user.id,
                variant.product_id,
                variant.id,
                quantity,
                quantity
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: "Selected size added to cart"
        });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({
            message: error.message || "Failed to add product to cart"
        });
    } finally {
        connection.release();
    }
});

// Update cart quantity using shared product stock
app.put("/api/cart/:id", authenticateToken, async (req, res) => {
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
            message: "Invalid quantity"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [items] = await connection.query(
            `SELECT c.id, c.product_id, v.active,
                    p.stock AS product_stock
             FROM carts c
             JOIN product_variants v ON c.variant_id = v.id
             JOIN products p ON c.product_id = p.id
             WHERE c.id = ? AND c.user_id = ?
             FOR UPDATE`,
            [req.params.id, req.user.id]
        );

        if (items.length === 0) {
            throw new Error("Cart item not found");
        }

        const item = items[0];

        if (!item.active) {
            throw new Error("This product size is unavailable");
        }

        const [others] = await connection.query(
            `SELECT COALESCE(SUM(quantity), 0) AS other_quantity
             FROM carts
             WHERE user_id = ? AND product_id = ? AND id <> ?`,
            [req.user.id, item.product_id, item.id]
        );

        const otherQuantity = Number(others[0].other_quantity);

        if (otherQuantity + quantity > Number(item.product_stock)) {
            throw new Error("Requested quantity exceeds available product stock");
        }

        await connection.query(
            `UPDATE carts
             SET quantity = ?
             WHERE id = ? AND user_id = ?`,
            [quantity, req.params.id, req.user.id]
        );

        await connection.commit();

        res.json({
            message: "Cart updated"
        });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({
            message: error.message || "Failed to update cart"
        });
    } finally {
        connection.release();
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
        console.error("Failed to remove cart item:", error.message);
        res.status(500).json({
            message: "Failed to remove item"
        });
    }
});

// Place order using variant prices and shared product stock
app.post("/api/orders", authenticateToken, async (req, res) => {
    const { address } = req.body;

    if (typeof address !== "string" || !address.trim()) {
        return res.status(400).json({
            message: "Delivery address is required"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [cart] = await connection.query(
            `SELECT c.product_id, c.variant_id, c.quantity,
                    p.stock AS product_stock,
                    v.variant_label, v.price, v.active
             FROM carts c
             JOIN products p ON c.product_id = p.id
             JOIN product_variants v ON c.variant_id = v.id
             WHERE c.user_id = ?
             FOR UPDATE`,
            [req.user.id]
        );

        if (cart.length === 0) {
            throw new Error("Your cart is empty");
        }

        const productTotals = new Map();
        let totalCents = 0;

        for (const item of cart) {
            if (!item.active) {
                throw new Error("A selected product size is unavailable");
            }

            const productId = Number(item.product_id);
            const existing = productTotals.get(productId) || {
                quantity: 0,
                stock: Number(item.product_stock)
            };

            existing.quantity += Number(item.quantity);
            productTotals.set(productId, existing);

            totalCents += Math.round(Number(item.price) * 100)
                * Number(item.quantity);
        }

        for (const [productId, totals] of productTotals) {
            if (totals.quantity > totals.stock) {
                throw new Error(
                    "Insufficient stock for a selected product"
                );
            }

            const [stockUpdate] = await connection.query(
                `UPDATE products
                 SET stock = stock - ?
                 WHERE id = ? AND stock >= ?`,
                [totals.quantity, productId, totals.quantity]
            );

            if (stockUpdate.affectedRows !== 1) {
                throw new Error(
                    "Stock changed during checkout. Please try again."
                );
            }
        }

        const total = totalCents / 100;

        const [orderResult] = await connection.query(
            `INSERT INTO orders (user_id, total_amount, address)
             VALUES (?, ?, ?)`,
            [req.user.id, total, address.trim()]
        );

        const orderId = orderResult.insertId;

        for (const item of cart) {
            await connection.query(
                `INSERT INTO order_items
                 (order_id, product_id, variant_id, variant_label,
                  quantity, price)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.product_id,
                    item.variant_id,
                    item.variant_label,
                    item.quantity,
                    item.price
                ]
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

// Admin: fetch all products and variants, including inactive variants.
// This protected endpoint does not change the public product API.
app.get(
    "/api/admin/products",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        try {
            const [products] = await db.query(
                `SELECT p.*, c.name AS category_name
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 ORDER BY p.featured DESC, p.id DESC`
            );

            const [variants] = await db.query(
                `SELECT id, product_id, variant_label,
                        quantity_value, unit, price, stock, active
                 FROM product_variants
                 ORDER BY product_id, quantity_value`
            );

            const variantsByProduct = new Map();

            for (const variant of variants) {
                if (!variantsByProduct.has(variant.product_id)) {
                    variantsByProduct.set(variant.product_id, []);
                }
                variantsByProduct.get(variant.product_id).push(variant);
            }

            res.json(products.map(product => ({
                ...product,
                variants: variantsByProduct.get(product.id) || []
            })));
        } catch (error) {
            console.error("Failed to fetch admin products:", error.message);
            res.status(500).json({
                message: "Failed to fetch admin products"
            });
        }
    }
);

// Variant sizes used by admin product creation
const ADMIN_VARIANT_SIZES = {
    1: [{ value: 250, unit: "g" }, { value: 500, unit: "g" }, { value: 1000, unit: "g" }],
    2: [{ value: 250, unit: "g" }, { value: 500, unit: "g" }, { value: 1000, unit: "g" }],
    3: [{ value: 250, unit: "g" }, { value: 500, unit: "g" }, { value: 1000, unit: "g" }],
    4: [{ value: 250, unit: "ml" }, { value: 500, unit: "ml" }, { value: 1000, unit: "ml" }],
    5: [{ value: 100, unit: "g" }, { value: 250, unit: "g" }, { value: 500, unit: "g" }],
    6: [{ value: 100, unit: "g" }, { value: 250, unit: "g" }, { value: 500, unit: "g" }],
    7: [{ value: 500, unit: "g" }, { value: 1000, unit: "g" }, { value: 2000, unit: "g" }],
    8: [{ value: 250, unit: "g" }, { value: 500, unit: "g" }, { value: 1000, unit: "g" }]
};

function adminVariantLabel(size) {
    const amount = size.value === 1000 ? "1" :
        size.value === 2000 ? "2" : String(size.value / 1000);
    if (size.unit === "ml" && size.value === 1000) return "1 litre";
    if (size.unit === "g" && size.value >= 1000) return `${amount} kg`;
    return `${size.value} ${size.unit}`;
}

// Admin: create product and its three zero-stock variants
app.post(
    "/api/admin/products",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        const {
            name, description, category_id, image, featured, variant_prices, stock
        } = req.body;

        const categoryId = Number(category_id);
        const sizes = ADMIN_VARIANT_SIZES[categoryId];
        const sharedStock = Number(stock);

        if (!name || !String(name).trim() || !sizes ||
            !Number.isInteger(sharedStock) || sharedStock < 0 ||
            !Array.isArray(variant_prices) || variant_prices.length !== 3 ||
            variant_prices.some(price => !Number.isFinite(Number(price)) || Number(price) <= 0)) {
            return res.status(400).json({
                message: "Enter product details, valid shared stock, and three valid variant prices."
            });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [categoryRows] = await connection.query(
                "SELECT id FROM categories WHERE id = ?",
                [categoryId]
            );

            if (!categoryRows.length) {
                throw new Error("Selected category does not exist.");
            }

            // Product stock is shared by all package-size variants.
            const mediumPrice = Number(variant_prices[1]);

            const [productResult] = await connection.query(
                `INSERT INTO products
                 (name, description, category_id, price, image, stock, featured)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    String(name).trim(),
                    description || "",
                    categoryId,
                    mediumPrice,
                    image || "",
                    sharedStock,
                    Boolean(featured)
                ]
            );

            const productId = productResult.insertId;

            for (let i = 0; i < sizes.length; i++) {
                const size = sizes[i];
                const label = adminVariantLabel(size);

                await connection.query(
                    `INSERT INTO product_variants
                     (product_id, variant_label, quantity_value, unit, price, stock, active)
                     VALUES (?, ?, ?, ?, ?, 0, 1)`,
                    [
                        productId,
                        label,
                        size.value,
                        size.unit,
                        Number(variant_prices[i])
                    ]
                );
            }

            await connection.commit();

            res.status(201).json({
                message: "Product and three zero-stock variants created.",
                productId
            });
        } catch (error) {
            await connection.rollback();
            console.error("Failed to create product:", error.message);
            res.status(500).json({
                message: "Failed to create product and variants"
            });
        } finally {
            connection.release();
        }
    }
);

// Admin: update product details and shared product stock.
app.put(
    "/api/admin/products/:id",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        try {
            const { name, description, category_id, image, featured, stock } = req.body;
            const sharedStock = Number(stock);

            if (!name || !String(name).trim() || !category_id ||
                !Number.isInteger(sharedStock) || sharedStock < 0) {
                return res.status(400).json({
                    message: "Product name, category, and valid shared stock are required."
                });
            }

            const [result] = await db.query(
                `UPDATE products
                 SET name = ?, description = ?, category_id = ?,
                     image = ?, featured = ?, stock = ?
                 WHERE id = ?`,
                [
                    String(name).trim(),
                    description || "",
                    category_id,
                    image || "",
                    Boolean(featured),
                    sharedStock,
                    req.params.id
                ]
            );

            if (!result.affectedRows) {
                return res.status(404).json({ message: "Product not found." });
            }

            res.json({ message: "Product details updated." });
        } catch (error) {
            console.error("Failed to update product:", error.message);
            res.status(500).json({ message: "Failed to update product details" });
        }
    }
);

// Admin: update one variant's price and active status. Stock is shared at product level.
app.patch(
    "/api/admin/variants/:id",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        try {
            const { price, active } = req.body;

            if (!Number.isFinite(Number(price)) || Number(price) <= 0 ||
                ![true, false, 0, 1].includes(active)) {
                return res.status(400).json({
                    message: "Provide a positive price and valid active status."
                });
            }

            const [result] = await db.query(
                `UPDATE product_variants
                 SET price = ?, active = ?
                 WHERE id = ?`,
                [Number(price), Boolean(Number(active)), req.params.id]
            );

            if (!result.affectedRows) {
                return res.status(404).json({ message: "Variant not found." });
            }

            res.json({ message: "Variant updated." });
        } catch (error) {
            console.error("Failed to update variant:", error.message);
            res.status(500).json({ message: "Failed to update variant" });
        }
    }
);

// Admin: prevent hard deletion so product/order history remains intact.
app.delete(
    "/api/admin/products/:id",
    authenticateToken,
    adminOnly,
    async (req, res) => {
        res.status(409).json({
            message: "Products cannot be hard-deleted. Deactivate their variants instead."
        });
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
