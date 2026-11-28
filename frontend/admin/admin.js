const API = "/api";
const ADMIN_TOKEN_KEY = "farmfresh_admin_token";

const loginPage = document.getElementById("loginPage");
const dashboardPage = document.getElementById("dashboardPage");
const loginMessage = document.getElementById("loginMessage");

let products = [];
let orders = [];
let categories = [];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (getToken()) {
        headers.Authorization = `Bearer ${getToken()}`;
    }

    const response = await fetch(API + path, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        if (getToken()) {
            logout();
            throw new Error("Admin session expired or access denied. Please sign in again.");
        }
    }

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

function showLogin(message = "") {
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
    loginMessage.textContent = message;
}

function showDashboard() {
    loginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
}

function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    showLogin();
}

document.getElementById("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    loginMessage.textContent = "Signing in...";

    try {
        const data = await api("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: document.getElementById("email").value.trim(),
                password: document.getElementById("password").value
            })
        });

        if (!data.user || data.user.role !== "admin") {
            throw new Error("This account does not have administrator access.");
        }

        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        document.getElementById("password").value = "";
        showDashboard();
        await loadDashboard();
    } catch (error) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        loginMessage.textContent = error.message;
    }
});

document.getElementById("logoutBtn").addEventListener("click", logout);

async function loadDashboard() {
    showDashboard();

    try {
        const [productData, orderData, categoryData] = await Promise.all([
            api("/admin/products"),
            api("/admin/orders"),
            api("/categories")
        ]);

        products = productData;
        orders = orderData;
        categories = categoryData;

        updateOverview();
        renderProducts();
        renderOrders();
        populateCategories();
    } catch (error) {
        alert(error.message);
    }
}

function updateOverview() {
    document.getElementById("productCount").textContent = products.length;
    document.getElementById("orderCount").textContent = orders.length;
    document.getElementById("lowStockCount").textContent =
        products.filter(product => Number(product.stock || 0) < 10).length;

    const revenue = orders.reduce(
        (total, order) => total + Number(order.total_amount || 0), 0
    );

    document.getElementById("revenueTotal").textContent = money(revenue);

    const recent = [...orders].slice(0, 5);

    document.getElementById("recentOrders").innerHTML = recent.length
        ? orderTable(recent)
        : "<p class='muted'>No orders have been placed yet.</p>";
}

function orderTable(list) {
    return `
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(order => `
                    <tr>
                        <td>#${escapeHTML(order.id)}</td>
                        <td>${escapeHTML(order.name || "Customer")}<br>
                            <span class="muted">${escapeHTML(order.email || "")}</span>
                        </td>
                        <td>${money(order.total_amount)}</td>
                        <td><span class="status">${escapeHTML(order.status || "Pending")}</span></td>
                        <td>${order.created_at
                            ? new Date(order.created_at).toLocaleDateString("en-IN")
                            : "—"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>`;
}

function renderOrders() {
    document.getElementById("ordersTable").innerHTML = orders.length
        ? `
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Delivery address</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>#${escapeHTML(order.id)}</td>
                            <td>${escapeHTML(order.name || "Customer")}</td>
                            <td>${escapeHTML(order.email || "")}</td>
                            <td>${escapeHTML(order.address || "—")}</td>
                            <td>${money(order.total_amount)}</td>
                            <td>
                                <span class="status">${escapeHTML(order.status || "Pending")}</span>
                                <div class="order-status-control">
                                    <select data-order-status>
                                        ${["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"].map(status =>
                                            `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`
                                        ).join("")}
                                    </select>
                                    <button type="button" class="secondary-btn" data-save-status="${escapeHTML(order.id)}">Save</button>
                                </div>
                            </td>
                            <td>${order.created_at
                                ? new Date(order.created_at).toLocaleString("en-IN")
                                : "—"}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>`
        : "<p class='muted'>No customer orders found.</p>";
}

function populateCategories() {
    const options = categories.map(category =>
        `<option value="${category.id}">${escapeHTML(category.name)}</option>`
    ).join("");

    document.getElementById("categoryFilter").innerHTML =
        `<option value="">All categories</option>${options}`;

    document.getElementById("productCategory").innerHTML = options;
}


const ADMIN_SIZE_OPTIONS = {
    1: [{ label: "250 g", value: 250, unit: "g" }, { label: "500 g", value: 500, unit: "g" }, { label: "1 kg", value: 1000, unit: "g" }],
    2: [{ label: "250 g", value: 250, unit: "g" }, { label: "500 g", value: 500, unit: "g" }, { label: "1 kg", value: 1000, unit: "g" }],
    3: [{ label: "250 g", value: 250, unit: "g" }, { label: "500 g", value: 500, unit: "g" }, { label: "1 kg", value: 1000, unit: "g" }],
    4: [{ label: "250 ml", value: 250, unit: "ml" }, { label: "500 ml", value: 500, unit: "ml" }, { label: "1 litre", value: 1000, unit: "ml" }],
    5: [{ label: "100 g", value: 100, unit: "g" }, { label: "250 g", value: 250, unit: "g" }, { label: "500 g", value: 500, unit: "g" }],
    6: [{ label: "100 g", value: 100, unit: "g" }, { label: "250 g", value: 250, unit: "g" }, { label: "500 g", value: 500, unit: "g" }],
    7: [{ label: "500 g", value: 500, unit: "g" }, { label: "1 kg", value: 1000, unit: "g" }, { label: "2 kg", value: 2000, unit: "g" }],
    8: [{ label: "250 g", value: 250, unit: "g" }, { label: "500 g", value: 500, unit: "g" }, { label: "1 kg", value: 1000, unit: "g" }]
};

function renderProducts() {
    const search = document.getElementById("productSearch").value.toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    const filtered = products.filter(product => {
        const matchesName = String(product.name || "").toLowerCase().includes(search);
        const matchesCategory = !category ||
            String(product.category_id) === String(category);
        return matchesName && matchesCategory;
    });

    document.getElementById("productsTable").innerHTML = filtered.length
        ? `
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Variants</th>
                        <th>Shared stock</th>
                        <th>Featured</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(product => {
                        const variants = Array.isArray(product.variants) ? product.variants : [];
                        const sharedStock = Number(product.stock || 0);
                        return `
                            <tr>
                                <td>
                                    <div class="product-cell">
                                        <img src="${escapeHTML(product.image || "")}"
                                             alt="" onerror="this.style.display='none'">
                                        <span>${escapeHTML(product.name)}</span>
                                    </div>
                                </td>
                                <td>${escapeHTML(product.category_name || "—")}</td>
                                <td>${variants.length} / 3</td>
                                <td>${sharedStock}</td>
                                <td>${Number(product.featured) ? "Yes" : "No"}</td>
                                <td>
                                    <button type="button" class="action-btn" data-edit="${escapeHTML(product.id)}">Edit</button>
                                </td>
                            </tr>`;
                    }).join("")}
                </tbody>
            </table>`
        : "<p class='muted'>No matching products found.</p>";
}

function renderNewVariantPriceFields() {
    const categoryId = Number(document.getElementById("productCategory").value);
    const sizes = ADMIN_SIZE_OPTIONS[categoryId] || [];
    const fields = document.getElementById("variantPriceFields");

    fields.innerHTML = sizes.length
        ? sizes.map((size, index) => `
            <div class="variant-price-field">
                <label for="variantPrice${index}">${size.label} price (₹)</label>
                <input id="variantPrice${index}" type="number"
                       min="0.01" step="0.01" required
                       placeholder="Price for ${size.label}">
            </div>
        `).join("")
        : "<p class='muted'>Select a valid category to set variant prices.</p>";
}

function renderExistingVariants(product) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const list = document.getElementById("variantManagementList");

    if (!variants.length) {
        list.innerHTML = "<p class='muted'>No variants are configured for this product yet.</p>";
        return;
    }

    list.innerHTML = variants.map(variant => `
        <div class="variant-admin-row" data-variant-row="${escapeHTML(variant.id)}">
            <h4>${escapeHTML(variant.variant_label || "Variant")}</h4>
            <div class="variant-admin-fields">
                <div>
                    <label>Price (₹)</label>
                    <input type="number" min="0.01" step="0.01"
                           data-variant-price value="${escapeHTML(variant.price)}" required>
                </div>
                <label class="variant-active-label">
                    <input type="checkbox" data-variant-active
                           ${Number(variant.active) ? "checked" : ""}>
                    Active
                </label>
            </div>
            <button type="button" class="secondary-btn"
                    data-save-variant="${escapeHTML(variant.id)}">Save variant</button>
            <span class="muted" data-variant-message></span>
        </div>
    `).join("");
}

function openProductModal(product = null) {
    document.getElementById("productForm").reset();
    document.getElementById("productMessage").textContent = "";
    document.getElementById("productId").value = product?.id || "";
    document.getElementById("modalTitle").textContent =
        product ? "Edit product details" : "Add product";

    const newPrices = document.getElementById("newVariantPrices");
    const existingVariants = document.getElementById("existingVariantManagement");
    const categorySelect = document.getElementById("productCategory");

    if (product) {
        document.getElementById("productName").value = product.name || "";
        document.getElementById("productDescription").value = product.description || "";
        categorySelect.value = product.category_id || "";
        categorySelect.disabled = true;
        document.getElementById("productImage").value = product.image || "";
        document.getElementById("productFeatured").checked =
            Boolean(Number(product.featured));
        document.getElementById("productStock").value =
            Number(product.stock || 0);

        newPrices.classList.add("hidden");
        existingVariants.classList.remove("hidden");
        renderExistingVariants(product);
    } else {
        categorySelect.disabled = false;
        document.getElementById("productStock").value = 0;
        newPrices.classList.remove("hidden");
        existingVariants.classList.add("hidden");
        document.getElementById("variantManagementList").innerHTML = "";
        renderNewVariantPriceFields();
    }

    document.getElementById("productModal").classList.remove("hidden");
}

function closeProductModal() {
    document.getElementById("productModal").classList.add("hidden");
    document.getElementById("productCategory").disabled = false;
}

document.getElementById("productCategory").addEventListener("change", renderNewVariantPriceFields);

document.getElementById("addProductBtn").addEventListener("click", () => {
    openProductModal();
});

document.getElementById("closeModal").addEventListener("click", closeProductModal);
document.getElementById("cancelModal").addEventListener("click", closeProductModal);

document.getElementById("productForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("productId").value;
    const categoryId = Number(document.getElementById("productCategory").value);
    const message = document.getElementById("productMessage");

    const product = {
        name: document.getElementById("productName").value.trim(),
        description: document.getElementById("productDescription").value.trim(),
        category_id: categoryId,
        image: document.getElementById("productImage").value.trim(),
        featured: document.getElementById("productFeatured").checked,
        stock: Number(document.getElementById("productStock").value)
    };

    if (!product.name || !ADMIN_SIZE_OPTIONS[categoryId]) {
        message.textContent = "Enter a product name and select a valid category.";
        return;
    }

    if (!Number.isInteger(product.stock) || product.stock < 0) {
        message.textContent = "Enter a valid whole-number shared stock quantity.";
        return;
    }

    if (!id) {
        product.variant_prices = [0, 1, 2].map(index =>
            Number(document.getElementById(`variantPrice${index}`)?.value)
        );

        if (product.variant_prices.some(price => !Number.isFinite(price) || price <= 0)) {
            message.textContent = "Enter a valid positive price for all three sizes.";
            return;
        }
    }

    try {
        await api(id ? `/admin/products/${id}` : "/admin/products", {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(product)
        });

        closeProductModal();
        await loadDashboard();
        alert(id ? "Product details and shared stock updated." : "Product and variants created.");
    } catch (error) {
        message.textContent = error.message;
    }
});

document.getElementById("variantManagementList").addEventListener("click", async event => {
    const button = event.target.closest("[data-save-variant]");
    if (!button) return;

    const variantId = button.dataset.saveVariant;
    const row = button.closest("[data-variant-row]");
    if (!variantId || !row) return;

    const price = Number(row.querySelector("[data-variant-price]").value);
    const active = row.querySelector("[data-variant-active]").checked;
    const message = row.querySelector("[data-variant-message]");

    if (!Number.isFinite(price) || price <= 0) {
        message.textContent = "Enter a valid positive price.";
        return;
    }

    button.disabled = true;
    message.textContent = "Saving...";

    try {
        await api(`/admin/variants/${variantId}`, {
            method: "PATCH",
            body: JSON.stringify({ price, active })
        });

        message.textContent = "Saved.";
        await loadDashboard();

        const updatedProduct = products.find(product =>
            String(product.id) === document.getElementById("productId").value
        );
        if (updatedProduct) renderExistingVariants(updatedProduct);
    } catch (error) {
        message.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

document.getElementById("productsTable").addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    if (!editButton) return;

    const product = products.find(item =>
        String(item.id) === editButton.dataset.edit
    );
    if (product) openProductModal(product);
});

document.getElementById("productSearch").addEventListener("input", renderProducts);
document.getElementById("categoryFilter").addEventListener("change", renderProducts);

document.getElementById("ordersTable").addEventListener("click", async event => {
    const button = event.target.closest("[data-save-status]");
    if (!button) return;

    const orderId = button.dataset.saveStatus;
    const row = button.closest("tr");
    const select = row?.querySelector("[data-order-status]");

    if (!orderId || !select) return;

    button.disabled = true;
    button.textContent = "Saving...";

    try {
        await api(`/admin/orders/${orderId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: select.value })
        });

        orders = await api("/admin/orders");
        updateOverview();
        renderOrders();
        alert(`Order #${orderId} status updated successfully.`);
    } catch (error) {
        alert(error.message);
        button.disabled = false;
        button.textContent = "Save";
    }
});

document.getElementById("refreshOrders").addEventListener("click", async () => {
    try {
        orders = await api("/admin/orders");
        updateOverview();
        renderOrders();
    } catch (error) {
        alert(error.message);
    }
});

function navigate(page) {
    document.querySelectorAll(".admin-page").forEach(section => {
        section.classList.add("hidden");
    });

    document.getElementById(`${page}Page`).classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    document.getElementById("pageTitle").textContent =
        page.charAt(0).toUpperCase() + page.slice(1);
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.go));
});

async function startAdmin() {
    if (!getToken()) {
        showLogin();
        return;
    }

    try {
        await loadDashboard();
    } catch (error) {
        showLogin(error.message);
    }
}

startAdmin().catch(error => {
    console.error("Admin initialization failed:", error);
    showLogin("Unable to initialize the admin dashboard. Please try again.");
});
