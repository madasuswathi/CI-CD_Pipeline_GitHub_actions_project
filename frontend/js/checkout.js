
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("checkout-form");

    if (form) {
        form.addEventListener("submit", placeOrder);
    }
});

async function placeOrder(event) {
    event.preventDefault();

    const token = localStorage.getItem("farmfresh_token");
    const address = document.getElementById("delivery-address").value.trim();
    const message = document.getElementById("checkout-message");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    message.textContent = "Placing your order...";
    message.className = "form-message";

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ address })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Order placement failed");
        }

        message.textContent =
            `Order placed successfully! Order ID: ${data.orderId}`;

        message.className = "form-message success";

        alert(
            `Thank you for shopping at FarmFresh!\nOrder ID: ${data.orderId}`
        );

        window.location.href = "index.html";

    } catch (error) {
        message.textContent = error.message;
        message.className = "form-message error";
    }
}

