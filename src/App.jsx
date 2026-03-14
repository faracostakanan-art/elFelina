import React, { useEffect, useState } from "react";
import Admin from "./Admin";

export default function App() {
  if (window.location.pathname === "/admin") {
    return <Admin />;
  }

  const tg = window.Telegram?.WebApp;
  const telegramUser = tg?.initDataUnsafe?.user;
  const USER_ID = telegramUser?.id ? String(telegramUser.id) : null;

  const [page, setPage] = useState("home");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [balance, setBalance] = useState(0);
  const [message, setMessage] = useState("");
  const [cart, setCart] = useState([]);

  const API = "https://felina-backend-production.up.railway.app/api";

  const loadUser = async () => {
    if (!USER_ID) return;

    try {
      const res = await fetch(`${API}/user/${USER_ID}`);
      const data = await res.json();

      if (res.ok) {
        setBalance(Number(data.balance || 0));
      } else {
        setMessage(data.error || "Erreur chargement utilisateur");
      }
    } catch (error) {
      console.error("loadUser", error);
      setMessage("Impossible de charger l'utilisateur");
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API}/products`);
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
        setMessage(data.error || "Erreur chargement produits");
      }
    } catch (error) {
      console.error("loadProducts", error);
      setProducts([]);
      setMessage("Impossible de charger les produits");
    }
  };

  const loadOrders = async () => {
    if (!USER_ID) return;

    try {
      const res = await fetch(`${API}/orders/${USER_ID}`);
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("loadOrders", error);
      setOrders([]);
    }
  };

  useEffect(() => {
    if (!USER_ID) {
      setMessage("Ouvre la boutique depuis Telegram");
      return;
    }

    loadUser();
    loadProducts();
    loadOrders();
  }, [USER_ID]);

  const addToCart = (product) => {
    const alreadyInCart = cart.some((item) => item.id === product.id);

    if (alreadyInCart) {
      setMessage("Ce produit est déjà dans le panier.");
      return;
    }

    setCart((prev) => [...prev, product]);
    setMessage("Produit ajouté au panier.");
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price), 0);

  const checkoutCart = async () => {
    setMessage("");

    if (cart.length === 0) {
      setMessage("Le panier est vide.");
      return;
    }

    if (balance < cartTotal) {
      setMessage("Solde insuffisant.");
      return;
    }

    try {
      for (const item of cart) {
        const res = await fetch(`${API}/checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: USER_ID,
            product_id: item.id
          })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setMessage(data.error || `Erreur achat pour ${item.title}`);
          await loadUser();
          await loadProducts();
          await loadOrders();
          return;
        }

        setBalance(Number(data.balance));
      }

      setCart([]);
      await loadProducts();
      await loadOrders();
      setPage("orders");
      setMessage("Achat effectué avec succès.");
    } catch (error) {
      console.error("checkoutCart", error);
      setMessage("Erreur lors du paiement.");
    }
  };

  const openOrder = async (orderId) => {
    try {
      const res = await fetch(`${API}/orders/${USER_ID}/${orderId}`);
      const data = await res.json();

      if (res.ok) {
        setSelectedOrder(data);
      } else {
        setMessage(data.error || "Commande introuvable");
      }
    } catch (error) {
      console.error("openOrder", error);
      setMessage("Erreur chargement commande");
    }
  };

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="app-title">Ma Boutique</div>
        <div className="app-subtitle">
          {telegramUser ? `Bienvenue ${telegramUser.first_name}` : "Interface sécurisée"}
        </div>
      </div>

      {page === "home" && (
        <>
          <div className="balance-card">
            <div className="balance-label">SOLDE DISPONIBLE</div>
            <div className="balance-amount">€{balance.toFixed(2)}</div>
            <div className="balance-hint">Appuyer pour actualiser</div>
          </div>

          <button className="filter-btn">Filtrer</button>
          <div className="result-count">{products.length} résultat(s)</div>

          {!!message && (
            <div style={{ color: "#ff8080", marginBottom: "14px", padding: "0 4px" }}>
              {message}
            </div>
          )}

          <div className="page-container">
            {products.map((product) => (
              <div className="order-card" key={product.id}>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    style={{
                      width: "100%",
                      borderRadius: "16px",
                      marginBottom: "12px",
                      display: "block",
                      objectFit: "cover",
                      maxHeight: "170px"
                    }}
                  />
                ) : null}

                <div className="order-top">
                  <div>
                    <div className="order-title">{product.title}</div>
                    <div className="order-date">{product.subtitle}</div>
                  </div>

                  <div className="status-badge waiting">DISPONIBLE</div>
                </div>

                <button className="details-btn" onClick={() => addToCart(product)}>
                  Ajouter au panier (€{product.price})
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {page === "cart" && (
        <div className="page-container">
          <h1 className="orders-heading">Panier</h1>

          {!!message && (
            <div style={{ color: "#ff8080", marginBottom: "14px" }}>
              {message}
            </div>
          )}

          {cart.length === 0 ? (
            <p>Ton panier est vide.</p>
          ) : (
            <>
              {cart.map((item) => (
                <div className="order-card" key={item.id}>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      style={{
                        width: "100%",
                        borderRadius: "16px",
                        marginBottom: "12px",
                        display: "block",
                        objectFit: "cover",
                        maxHeight: "170px"
                      }}
                    />
                  ) : null}

                  <div className="order-top">
                    <div>
                      <div className="order-title">{item.title}</div>
                      <div className="order-date">{item.subtitle}</div>
                    </div>
                    <div className="status-badge waiting">PANIER</div>
                  </div>

                  <div style={{ marginTop: "18px", fontSize: "20px", fontWeight: "700" }}>
                    €{Number(item.price).toFixed(2)}
                  </div>

                  <button
                    className="details-btn"
                    onClick={() => removeFromCart(item.id)}
                    style={{ marginTop: "18px", background: "#2b2d33" }}
                  >
                    Retirer
                  </button>
                </div>
              ))}

              <div className="order-card">
                <div className="order-title" style={{ fontSize: "24px" }}>
                  Total panier
                </div>
                <div className="order-date" style={{ marginTop: "12px" }}>
                  {cart.length} produit(s)
                </div>
                <div style={{ marginTop: "18px", fontSize: "28px", fontWeight: "800" }}>
                  €{cartTotal.toFixed(2)}
                </div>

                <button className="details-btn" onClick={checkoutCart}>
                  Payer avec le solde
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {page === "orders" && (
        <div className="page-container">
          <h1 className="orders-heading">Commandes</h1>

          {selectedOrder ? (
            <div className="order-card">
              <div className="order-top">
                <div>
                  <div className="order-title">Commande #{selectedOrder.id}</div>
                  <div className="order-date">{selectedOrder.created_at}</div>
                </div>
                <div className="status-badge done">{selectedOrder.status}</div>
              </div>

              {(selectedOrder.items || []).map((item) => (
                <div key={item.id} style={{ marginTop: "20px" }}>
                  <div className="order-title" style={{ fontSize: "24px" }}>{item.title}</div>
                  <div className="order-date">{item.subtitle}</div>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      background: "#101114",
                      padding: "14px",
                      borderRadius: "16px",
                      color: "#fff",
                      marginTop: "16px"
                    }}
                  >
                    {item.hidden_content}
                  </pre>
                </div>
              ))}

              <button className="details-btn" onClick={() => setSelectedOrder(null)}>
                Retour
              </button>
            </div>
          ) : (
            (orders || []).map((order) => (
              <div className="order-card" key={order.id}>
                <div className="order-top">
                  <div>
                    <div className="order-title">Commande #{order.id}</div>
                    <div className="order-date">{order.created_at}</div>
                  </div>
                  <div className="status-badge done">{order.status}</div>
                </div>

                <button className="details-btn" onClick={() => openOrder(order.id)}>
                  Voir les détails
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="bottom-nav">
        <div
          className={page === "home" ? "nav-item active-nav" : "nav-item"}
          onClick={() => {
            setPage("home");
            setSelectedOrder(null);
            setMessage("");
          }}
        >
          <div className="nav-icon">⌂</div>
          <div className="nav-text">Accueil</div>
        </div>

        <div
          className={page === "cart" ? "nav-item active-nav" : "nav-item"}
          onClick={() => {
            setPage("cart");
            setSelectedOrder(null);
            setMessage("");
          }}
        >
          <div className="nav-icon">🛒</div>
          <div className="nav-text">Panier ({cart.length})</div>
        </div>

        <div
          className={page === "orders" ? "nav-item active-nav" : "nav-item"}
          onClick={() => {
            setPage("orders");
            setMessage("");
          }}
        >
          <div className="nav-icon">⬡</div>
          <div className="nav-text">Commandes</div>
        </div>
      </div>
    </div>
  );
}
