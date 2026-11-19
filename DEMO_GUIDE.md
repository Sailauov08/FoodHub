# FoodHub — demo walkthrough (5 minutes)

FoodHub is a demo restaurant: the menu, address and contacts are sample content, and orders are not delivered.
Everything else is real: orders are stored in PostgreSQL, prices are calculated on the server, and every panel
enforces its permissions on the server.

> Data resets every night at 02:00 (Almaty time). Feel free to place orders and edit the menu.

## 1. Order as a customer (2 min)

1. Open the site. It starts in **Kazakh**; switch to **РУС** or **ENG** in the header at any time.
2. Open **Menu** → pick a pizza → choose a size, a crust and toppings. The price updates as you choose.
3. Add a burger too, open the cart, and change quantities.
4. **Checkout** → enter any name and a Kazakhstan mobile number (e.g. `+7 701 123 45 67`) → choose **Pickup** →
   **Place order**. You land on a private tracking page that updates on its own.

Optional: on the cart page, try the promo code `PICKUP500` (orders over 8,000 ₸).

## 2. See the restaurant side (3 min)

1. Go to **Sign Up/Sign In** → under **Demo accounts** click **Kitchen**. No password is needed.
2. Your order appears in the **New** column. Click **Accept** → **Start cooking** → **Mark ready**.
   Go back to the tracking tab: the status has changed.
3. In the **Demo** bar at the bottom of the screen, switch to **Manager** (or **Admin**):
   - **Orders**: find your order and hand it over.
   - **Analytics**: revenue, average order value, top dishes, peak hours, CSV export.
   - **Products**: edit a dish or toggle its availability. The storefront updates immediately.
4. Switch to **Customer** to see order history, saved addresses and favourites.

## What the demo accounts cannot do

To keep the demo usable for everyone, demo accounts cannot:

- change roles or restaurant settings;
- delete or archive data;
- change passwords.

Other people's names, phones and addresses are masked. A real restaurant's own admin account has no such limits.

## Roles at a glance

| Role | Panel | Purpose |
|---|---|---|
| Customer | `/account` | Orders, history, addresses, favourites |
| Kitchen | `/kitchen` | Live order board for the cooks (tablet-friendly) |
| Manager | `/admin` | Orders, menu, promo codes, analytics |
| Admin | `/admin` | Everything, including staff roles and restaurant settings |
