
const CART_API = "/api/cart";

function cartToken() {
    return localStorage.getItem("farmfresh_token");
}

function money(value) {
    return "₹" + Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function loadCart() {
    const container = document.getElementById("cart-items");

    if (!cartToken()) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>Please login to view your cart.</h2>
                <a href="login.html" class="btn-primary">Login</a>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(CART_API, {
            headers: {
                "Authorization": `Bearer ${cartToken()}`
            }
        });

        const cart = await response.json();

        if (!response.ok) {
            throw new Error(cart.message || "Unable to load cart");
        }

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>🛒</span>
                    <h2>Your cart is empty</h2>
                    <p>Explore our products and add something you love.</p>
                    <a href="products.html" class="btn-primary">
                        Shop Now
                    </a>
                </div>
            `;

            updateSummary(0);
            return;
        }

        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img
                    src="${item.image || "https://placehold.co/120x120?text=Product"}"
                    alt="${item.name}"
                >

                <div class="cart-item-info">
                    <h3>${item.name}</h3>
                    <p>${money(item.price)}</p>

                    <div class="quantity-control">
                        <button onclick="changeQuantity(${item.id}, ${item.quantity - 1})"
                                ${item.quantity <= 1 ? "disabled" : ""}>
                            −
                        </button>

                        <span>${item.quantity}</span>

                        <button onclick="changeQuantity(${item.id}, ${item.quantity + 1})">
                            +
                        </button>
                    </div>
                </div>

                <div class="cart-item-right">
                    <strong>${money(item.subtotal)}</strong>

                    <button class="remove-btn"
                            onclick="removeCartItem(${item.id})">
                        Remove
                    </button>
                </div>
            </div>
        `).join("");

        const subtotal = cart.reduce(
            (total, item) => total + Number(item.subtotal),
            0
        );

        updateSummary(subtotal);

    } catch (error) {
        container.innerHTML =
            `<div class="empty-state">${error.message}</div>`;
    }
}

function updateSummary(subtotal) {
    document.getElementById("cart-subtotal").textContent = money(subtotal);
    document.getElementById("cart-total").textContent = money(subtotal);
}

async function changeQuantity(cartId, quantity) {
    if (quantity < 1) return;

    try {
        const response = await fetch(`${CART_API}/${cartId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cartToken()}`
            },
            body: JSON.stringify({ quantity })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Update failed");
        }

        await loadCart();

    } catch (error) {
        alert(error.message);
    }
}

async function removeCartItem(cartId) {
    if (!confirm("Remove this product from your cart?")) return;

    try {
        const response = await fetch(`${CART_API}/${cartId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${cartToken()}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Remove failed");
        }

        await loadCart();

    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener("DOMContentLoaded", loadCart);

