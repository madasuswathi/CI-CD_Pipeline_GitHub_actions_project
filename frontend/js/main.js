
const API = "/api";

function getToken() {
    return localStorage.getItem("farmfresh_token");
}

function formatPrice(price) {
    return "₹" + Number(price).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

const FALLBACK_IMAGE =
    "/images/products/placeholder.svg";



function getProductImage(product) {
    return product.image || FALLBACK_IMAGE;
}

function loadImageFallback(img) {
    const category = (img.dataset.category || "").toLowerCase();

    const categoryImages = {
        "honey": "/images/categories/honey.jpg",
        "ghee": "/images/categories/ghee.jpg",
        "pickles": "/images/categories/pickles.jpg",
        "oils": "/images/categories/oils.jpg",
        "spices": "/images/categories/spices.jpg",
        "snacks": "/images/categories/snacks.jpg",
        "grains & pulses": "/images/categories/grains-pulses.jpg",
        "jaggery & sweeteners": "/images/categories/jaggery-sweeteners.jpg"
    };

    img.onerror = null;
    img.src = categoryImages[category] || FALLBACK_IMAGE;
}



let allProducts = [];

function normalizeCategory(value) {
    let category = String(value || "")
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const aliases = {
        "grains-and-pulses": "grains-pulses",
        "jaggery-and-sweeteners": "jaggery-sweeteners"
    };

    return aliases[category] || category;
}

function getProductCategory(product) {
    return normalizeCategory(
        product.category_slug ||
        product.category_name ||
        product.category ||
        ""
    );
}

function renderProducts(containerId, products) {
    const container = document.getElementById(containerId);

    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <p class="empty-products">
                No products found. Please try another category or search.
            </p>
        `;
        return;
    }

    container.innerHTML = products.map(product => {
        const variants = Array.isArray(product.variants)
            ? product.variants
            : [];

        const firstVariant = variants[0];
        const firstStock = Number(product.stock || 0);
        const available = variants.length > 0 && firstStock > 0;

        const variantOptions = variants.length
            ? variants.map(variant => `
                <option
                    value="${Number(variant.id)}"
                    data-price="${Number(variant.price)}"
                    data-stock="${Number(product.stock || 0)}"
                >
                    ${escapeHTML(variant.variant_label)}
                </option>
            `).join("")
            : `<option value="">Sizes unavailable</option>`;

        return `
            <div class="product-card" data-product-id="${Number(product.id)}">
                <div class="product-image-wrapper">
                    <img
                        src="${escapeHTML(getProductImage(product))}"
                        alt="${escapeHTML(product.name)}"
                        data-category="${escapeHTML(product.category_name || "")}"
                        class="product-image"
                        loading="lazy"
                        onerror="loadImageFallback(this)"
                    />
                </div>

                <div class="product-details">
                    <span class="product-category">
                        ${escapeHTML(product.category_name || "Organic")}
                    </span>

                    <h3>${escapeHTML(product.name)}</h3>

                    <p class="product-description">
                        ${escapeHTML(
                            product.description ||
                            "Natural and fresh product"
                        )}
                    </p>

                    <label class="variant-label">
                        Choose size
                    </label>

                    <select
                        class="variant-select"
                        onchange="updateProductVariant(this)"
                        ${variants.length ? "" : "disabled"}
                    >
                        ${variantOptions}
                    </select>

                    <div class="product-price">
                        ${firstVariant
                            ? formatPrice(Number(firstVariant.price))
                            : "Price unavailable"}
                    </div>

                    <p class="variant-stock">
                        ${available
                            ? `${firstStock} in stock`
                            : "Out of stock"}
                    </p>

                    <button
                        class="add-to-cart-btn"
                        onclick="addToCart(${Number(product.id)}, this)"
                        ${available ? "" : "disabled"}
                    >
                        ${available ? "Add to Cart" : "Out of Stock"}
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function updateProductVariant(select) {
    const card = select.closest(".product-card");
    const option = select.selectedOptions[0];

    if (!card || !option) return;

    const priceElement = card.querySelector(".product-price");
    const stockElement = card.querySelector(".variant-stock");
    const button = card.querySelector(".add-to-cart-btn");

    const price = Number(option.dataset.price || 0);
    const stock = Number(option.dataset.stock || 0);
    const available = stock > 0;

    priceElement.textContent = formatPrice(price);
    stockElement.textContent = available
        ? `${stock} in stock`
        : "Out of stock";

    button.disabled = !available;
    button.textContent = available
        ? "Add to Cart"
        : "Out of Stock";
}

function filterProducts() {
    const categoryFilter = document.getElementById("category-filter");
    const searchInput = document.getElementById("product-search");

    if (!categoryFilter || !searchInput) return;

    const selectedCategory =
        normalizeCategory(categoryFilter.value);

    const searchText =
        searchInput.value.trim().toLowerCase();

    const filteredProducts = allProducts.filter(product => {
        const productCategory = getProductCategory(product);

        const categoryMatches =
            !selectedCategory ||
            productCategory === selectedCategory;

        const searchMatches =
            !searchText ||
            String(product.name || "").toLowerCase().includes(searchText) ||
            String(product.description || "").toLowerCase().includes(searchText) ||
            String(product.category_name || "").toLowerCase().includes(searchText);

        return categoryMatches && searchMatches;
    });

    renderProducts("all-products", filteredProducts);
}

async function loadProducts(containerId, featured = false) {
    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = `
        <div class="loading-products">
            Loading FarmFresh products...
        </div>
    `;

    try {
        const response = await fetch(`${API}/products`);

        if (!response.ok) {
            throw new Error("Unable to load products from backend");
        }

        const products = await response.json();

        if (!Array.isArray(products)) {
            throw new Error("Invalid product response");
        }

        allProducts = products;

        if (featured) {
            renderProducts(containerId, products.slice(0, 4));
        } else {
            // Read category from URL, such as products.html?category=honey
            const params = new URLSearchParams(window.location.search);
            const requestedCategory = params.get("category");

            const categoryFilter =
                document.getElementById("category-filter");

            if (requestedCategory && categoryFilter) {
                categoryFilter.value =
                    normalizeCategory(requestedCategory);
            }

            filterProducts();
        }

    } catch (error) {
        console.error("Product loading error:", error);

        container.innerHTML = `
            <p class="error-message">
                Unable to load products. Please check the backend server.
            </p>
        `;
    }
}

async function addToCart(productId, button) {
    const token = getToken();

    if (!token) {
        alert("Please login to add products to your cart.");
        window.location.href = "/login.html";
        return;
    }

    const card = button?.closest(".product-card");
    const variantSelect = card?.querySelector(".variant-select");
    const variantId = Number(variantSelect?.value);

    if (
        !card ||
        Number(card.dataset.productId) !== Number(productId) ||
        !Number.isInteger(variantId) ||
        variantId <= 0
    ) {
        alert("Please select a valid product size.");
        return;
    }

    try {
        const response = await fetch(`${API}/cart`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                variant_id: variantId,
                quantity: 1
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to add item to cart"
            );
        }

        alert("Product added to cart successfully!");

    } catch (error) {
        console.error("Cart error:", error);
        alert(error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    void loadProducts("featured-products", true);
    void loadProducts("all-products", false);

    const categoryFilter =
        document.getElementById("category-filter");

    const searchInput =
        document.getElementById("product-search");

    const searchButton =
        document.getElementById("search-button");

    if (categoryFilter) {
        categoryFilter.addEventListener("change", filterProducts);
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterProducts);
    }

    if (searchButton) {
        searchButton.addEventListener("click", filterProducts);
    }
});


