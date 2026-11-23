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
            api("/products"),
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
        products.filter(product => Number(product.stock) < 10).length;

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

function renderProducts() {
    const search = document.getElementById("productSearch").value.toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    const filtered = products.filter(product => {
        const matchesName = product.name.toLowerCase().includes(search);
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
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Featured</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(product => `
                        <tr>
                            <td>
                                <div class="product-cell">
                                    <img src="${escapeHTML(product.image || "")}"
                                         alt="" onerror="this.style.display='none'">
                                    <span>${escapeHTML(product.name)}</span>
                                </div>
                            </td>
                            <td>${escapeHTML(product.category_name || "—")}</td>
                            <td>${money(product.price)}</td>
                            <td>${escapeHTML(product.stock)}</td>
                            <td>${Number(product.featured) ? "Yes" : "No"}</td>
                            <td>
                                <button class="action-btn" data-edit="${product.id}">Edit</button>
                                <button class="action-btn delete" data-delete="${product.id}">Delete</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>`
        : "<p class='muted'>No matching products found.</p>";
}

function openProductModal(product = null) {
    document.getElementById("productForm").reset();
    document.getElementById("productMessage").textContent = "";
    document.getElementById("productId").value = product?.id || "";
    document.getElementById("modalTitle").textContent =
        product ? "Edit product" : "Add product";

    if (product) {
        document.getElementById("productName").value = product.name || "";
        document.getElementById("productDescription").value = product.description || "";
        document.getElementById("productCategory").value = product.category_id || "";
        document.getElementById("productPrice").value = product.price || "";
        document.getElementById("productStock").value = product.stock ?? 0;
        document.getElementById("productImage").value = product.image || "";
        document.getElementById("productFeatured").checked = Boolean(Number(product.featured));
    }

    document.getElementById("productModal").classList.remove("hidden");
}

function closeProductModal() {
    document.getElementById("productModal").classList.add("hidden");
}

document.getElementById("addProductBtn").addEventListener("click", () => {
    openProductModal();
});

document.getElementById("closeModal").addEventListener("click", closeProductModal);
document.getElementById("cancelModal").addEventListener("click", closeProductModal);

document.getElementById("productForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("productId").value;
    const product = {
        name: document.getElementById("productName").value.trim(),
        description: document.getElementById("productDescription").value.trim(),
        category_id: Number(document.getElementById("productCategory").value),
        price: Number(document.getElementById("productPrice").value),
        stock: Number(document.getElementById("productStock").value),
        image: document.getElementById("productImage").value.trim(),
        featured: document.getElementById("productFeatured").checked
    };

    const message = document.getElementById("productMessage");

    if (!product.name || product.price <= 0 ||
        product.stock < 0 || !Number.isInteger(product.stock)) {
        message.textContent = "Enter a valid name, price and whole-number stock.";
        return;
    }

    try {
        await api(id ? `/admin/products/${id}` : "/admin/products", {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(product)
        });

        closeProductModal();
        await loadDashboard();
        alert(id ? "Product updated successfully." : "Product added successfully.");
    } catch (error) {
        message.textContent = error.message;
    }
});

document.getElementById("productsTable").addEventListener("click", async event => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
        const product = products.find(item => String(item.id) === editId);
        if (product) openProductModal(product);
    }

    if (deleteId) {
        const product = products.find(item => String(item.id) === deleteId);
        if (!product) return;

        if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

        try {
            await api(`/admin/products/${deleteId}`, { method: "DELETE" });
            await loadDashboard();
            alert("Product deleted.");
        } catch (error) {
            alert(error.message);
        }
    }
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
