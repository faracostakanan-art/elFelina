import React, { useEffect, useState } from "react";
import Admin from "./Admin";

export default function App() {

  if (window.location.pathname === "/admin") {
    return <Admin />;
  }

  const tg = window.Telegram?.WebApp
  const telegramUser = tg?.initDataUnsafe?.user

  const USER_ID = telegramUser?.id ? String(telegramUser.id) : null

  const [page, setPage] = useState("home");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [balance, setBalance] = useState(0);
  const [message, setMessage] = useState("");
  const [cart, setCart] = useState([]);

  const API = "https://el-felina.vercel.app/api"

  const loadUser = async () => {

    if (!USER_ID) return

    try {

      const res = await fetch(`${API}/user/${USER_ID}`)
      const data = await res.json()

      if (res.ok) {

        setBalance(Number(data.balance || 0))

      } else {

        setMessage(data.error || "Erreur chargement utilisateur")

      }

    } catch (error) {

      console.error("loadUser", error)
      setMessage("Impossible de charger l'utilisateur")

    }

  }

  const loadProducts = async () => {

    try {

      const res = await fetch(`${API}/products`)
      const data = await res.json()

      if (res.ok && Array.isArray(data)) {

        setProducts(data)

      } else {

        setProducts([])
        setMessage(data.error || "Erreur chargement produits")

      }

    } catch (error) {

      console.error("loadProducts", error)
      setProducts([])
      setMessage("Impossible de charger les produits")

    }

  }

  const loadOrders = async () => {

    if (!USER_ID) return

    try {

      const res = await fetch(`${API}/orders/${USER_ID}`)
      const data = await res.json()

      if (res.ok && Array.isArray(data)) {

        setOrders(data)

      } else {

        setOrders([])

      }

    } catch (error) {

      console.error("loadOrders", error)
      setOrders([])

    }

  }

  useEffect(() => {

    if (!USER_ID) {

      setMessage("Ouvre la boutique depuis Telegram")

      return

    }

    loadUser()
    loadProducts()
    loadOrders()

  }, [USER_ID])

  const addToCart = (product) => {

    const alreadyInCart = cart.some((item) => item.id === product.id)

    if (alreadyInCart) {

      setMessage("Ce produit est déjà dans le panier.")
      return

    }

    setCart((prev) => [...prev, product])
    setMessage("Produit ajouté au panier.")

  }

  const removeFromCart = (productId) => {

    setCart((prev) => prev.filter((item) => item.id !== productId))

  }

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price), 0)

  const checkoutCart = async () => {

    setMessage("")

    if (cart.length === 0) {

      setMessage("Le panier est vide.")
      return

    }

    if (balance < cartTotal) {

      setMessage("Solde insuffisant.")
      return

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

        })

        const data = await res.json()

        if (!res.ok || !data.success) {

          setMessage(data.error || `Erreur achat pour ${item.title}`)
          await loadUser()
          await loadProducts()
          await loadOrders()
          return

        }

        setBalance(Number(data.balance))

      }

      setCart([])
      await loadProducts()
      await loadOrders()
      setPage("orders")
      setMessage("Achat effectué avec succès.")

    } catch (error) {

      console.error("checkoutCart", error)
      setMessage("Erreur lors du paiement.")

    }

  }

  const openOrder = async (orderId) => {

    try {

      const res = await fetch(`${API}/orders/${USER_ID}/${orderId}`)
      const data = await res.json()

      if (res.ok) {

        setSelectedOrder(data)

      } else {

        setMessage(data.error || "Commande introuvable")

      }

    } catch (error) {

      console.error("openOrder", error)
      setMessage("Erreur chargement commande")

    }

  }

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

                <div className="order-top">

                  <div>
                    <div className="order-title">{product.title}</div>
                    <div className="order-date">{product.subtitle}</div>
                  </div>

                  <div className="status-badge waiting">DISPONIBLE</div>

                </div>

                <button
                  className="details-btn"
                  onClick={() => addToCart(product)}
                >

                  Ajouter au panier (€{product.price})

                </button>

              </div>

            ))}

          </div>

        </>
      )}

      <div className="bottom-nav">

        <div
          className={page === "home" ? "nav-item active-nav" : "nav-item"}
          onClick={() => setPage("home")}
        >

          <div className="nav-icon">⌂</div>
          <div className="nav-text">Accueil</div>

        </div>

        <div
          className={page === "cart" ? "nav-item active-nav" : "nav-item"}
          onClick={() => setPage("cart")}
        >

          <div className="nav-icon">🛒</div>
          <div className="nav-text">Panier ({cart.length})</div>

        </div>

        <div
          className={page === "orders" ? "nav-item active-nav" : "nav-item"}
          onClick={() => setPage("orders")}
        >

          <div className="nav-icon">⬡</div>
          <div className="nav-text">Commandes</div>

        </div>

      </div>

    </div>

  )

}
