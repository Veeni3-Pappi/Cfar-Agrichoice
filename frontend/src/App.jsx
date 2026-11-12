import { useEffect, useMemo, useState } from 'react'
import { Leaf, MapPin, PackageCheck, Search, ShoppingCart, Trash2, Minus, Plus } from 'lucide-react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const categories = [
  { value: 'all', label: 'All products' },
  { value: 'briquettes', label: 'Briquettes' },
  { value: 'dragonfruit', label: 'Dragon fruit' },
  { value: 'pixie_oranges', label: 'Pixie oranges' },
  { value: 'sweet_potatoes', label: 'Sweet potatoes' },
]

const productArt = {
  briquettes: { emoji: '🔥', className: 'art-briquettes', label: 'Briquettes' },
  dragonfruit: { emoji: '🌵', className: 'art-dragonfruit', label: 'Dragon fruit' },
  pixie_oranges: { emoji: '🍊', className: 'art-oranges', label: 'Pixie oranges' },
  sweet_potatoes: { emoji: '🍠', className: 'art-potatoes', label: 'Sweet potatoes' },
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(Number(price))
}

function ProductCard({ product, onAddToCart }) {
  const art = productArt[product.product_type] || {
    emoji: '🌱',
    className: 'art-default',
    label: 'Farm produce',
  }

  const quantity = Number(product.stock_quantity || 0)
  const isLow = quantity > 0 && quantity <= Number(product.alert_threshold || 0)
  const disabled = quantity === 0

  return (
    <article className="product-card">
      <div className={`product-art ${art.className}`} role="img" aria-label={art.label}>
        <span aria-hidden="true">{art.emoji}</span>
        <span className="art-caption">Fresh from our farms</span>
      </div>
      <div className="product-info">
        <div className="product-title-row">
          <div>
            <p className="product-category">{art.label}</p>
            <h3>{product.product_name}</h3>
          </div>
          <span className={`stock-badge ${quantity === 0 ? 'stock-empty' : isLow ? 'stock-low' : 'stock-ready'}`}>
            {quantity === 0 ? 'Sold out' : isLow ? 'Low stock' : 'In stock'}
          </span>
        </div>
        <div className="product-bottom">
          <div>
            <p className="price">{formatPrice(product.unit_price)}</p>
            <p className="unit">per {product.unit}</p>
          </div>
          <div className="product-actions">
            <p className="quantity">
              <PackageCheck size={16} aria-hidden="true" />
              {quantity} {product.unit} available
            </p>
            <button
              type="button"
              className="add-cart-button"
              onClick={() => onAddToCart(product)}
              disabled={disabled}
            >
              {disabled ? 'Sold out' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function App() {
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({ customerName: '', customerPhone: '', paymentMode: 'cash' })
  const [checkoutState, setCheckoutState] = useState({ loading: false, error: '', receipt: null })
  const [currentView, setCurrentView] = useState('shop')
  const [inventory, setInventory] = useState([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [restockForm, setRestockForm] = useState({
    productId: '',
    quantity: '5',
    source: 'harvested',
    recordedBy: '',
  })
  const [restockState, setRestockState] = useState({ loading: false, error: '', success: '' })
  const [salesSummary, setSalesSummary] = useState({ total_revenue: 0, total_orders: 0, daily_revenue: 0, orders: [] })
  const [salesLoading, setSalesLoading] = useState(false)

  async function loadProducts(selectedBranchId) {
    if (!selectedBranchId) {
      setProducts([])
      return
    }

    setLoadingProducts(true)
    setError('')

    try {
      const query = new URLSearchParams({ branch_id: selectedBranchId })
      const response = await fetch(`${API_URL}/products?${query}`)
      if (!response.ok) throw new Error('Could not load products for this branch.')
      setProducts(await response.json())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoadingProducts(false)
    }
  }

  async function loadInventory(selectedBranchId) {
    if (!selectedBranchId) {
      setInventory([])
      return
    }

    setInventoryLoading(true)
    try {
      const response = await fetch(`${API_URL}/inventory/${selectedBranchId}`)
      if (!response.ok) throw new Error('Could not load branch inventory.')
      const result = await response.json()
      setInventory(result.inventory || [])
    } catch (loadError) {
      setInventory([])
      setRestockState((current) => ({
        ...current,
        error: loadError.message,
      }))
    } finally {
      setInventoryLoading(false)
    }
  }

  async function loadSalesSummary(selectedBranchId) {
    setSalesLoading(true)
    try {
      const url = new URL(`${API_URL}/orders`)
      if (selectedBranchId) {
        url.searchParams.set('branch_id', selectedBranchId)
      }
      url.searchParams.set('limit', '8')

      const response = await fetch(url)
      if (!response.ok) throw new Error('Could not load sales data.')
      const result = await response.json()
      setSalesSummary(result)
    } catch (loadError) {
      setSalesSummary({ total_revenue: 0, total_orders: 0, daily_revenue: 0, orders: [] })
      setError(loadError.message)
    } finally {
      setSalesLoading(false)
    }
  }

  useEffect(() => {
    async function loadBranches() {
      try {
        const response = await fetch(`${API_URL}/branches`)
        if (!response.ok) throw new Error('Could not load branches.')
        const data = await response.json()
        setBranches(data)
        if (data.length > 0) setBranchId(String(data[0].branch_id))
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoadingBranches(false)
      }
    }

    loadBranches()
  }, [])

  useEffect(() => {
    if (!branchId) return
    loadProducts(branchId)
  }, [branchId])

  useEffect(() => {
    if (currentView === 'admin' && branchId) {
      loadInventory(branchId)
      loadSalesSummary(branchId)
    }
  }, [branchId, currentView])

  useEffect(() => {
    setCart([])
    setCartOpen(false)
    setCheckoutForm({ customerName: '', customerPhone: '', paymentMode: 'cash' })
    setCheckoutState({ loading: false, error: '', receipt: null })
  }, [branchId])

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesCategory = category === 'all' || product.product_type === category
      const matchesSearch = product.product_name.toLowerCase().includes(normalizedSearch)
      return matchesCategory && matchesSearch
    })
  }, [category, products, search])

  const selectedBranch = branches.find((branch) => String(branch.branch_id) === branchId)
  const availableCount = products.filter((product) => Number(product.stock_quantity) > 0).length
  const lowStockCount = inventory.filter((item) => Number(item.stock_quantity || 0) <= Number(item.alert_threshold || 0)).length
  const totalStockUnits = inventory.reduce((sum, item) => sum + Number(item.stock_quantity || 0), 0)

  const cartItems = useMemo(() => cart.map((item) => ({
    ...item,
    subtotal: Number(item.unit_price) * Number(item.quantity),
  })), [cart])

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0),
    [cartItems],
  )

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  async function handleRestock(event) {
    event.preventDefault()

    if (!restockForm.productId) {
      setRestockState({ loading: false, error: 'Select a product to restock.', success: '' })
      return
    }

    const quantity = Number(restockForm.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setRestockState({ loading: false, error: 'Restock quantity must be greater than zero.', success: '' })
      return
    }

    setRestockState({ loading: true, error: '', success: '' })

    try {
      const response = await fetch(`${API_URL}/inventory/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: Number(branchId),
          product_id: Number(restockForm.productId),
          quantity,
          source: restockForm.source,
          recorded_by: restockForm.recordedBy ? Number(restockForm.recordedBy) : null,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Restock failed.')
      }

      setRestockState({
        loading: false,
        error: '',
        success: `${result.inventory.product_name} restocked successfully.`,
      })
      setRestockForm({
        productId: '',
        quantity: '5',
        source: 'harvested',
        recordedBy: '',
      })
      await loadProducts(branchId)
      await loadInventory(branchId)
    } catch (restockError) {
      setRestockState({ loading: false, error: restockError.message, success: '' })
    }
  }

  function handleAddToCart(product) {
    const stock = Number(product.stock_quantity || 0)
    if (stock <= 0) return

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.product_id === product.product_id)
      if (existingItem) {
        const nextQuantity = Math.min(existingItem.quantity + 1, stock)
        return currentCart.map((item) => (item.product_id === product.product_id
          ? { ...item, quantity: nextQuantity }
          : item))
      }

      return [
        ...currentCart,
        {
          product_id: product.product_id,
          product_name: product.product_name,
          product_type: product.product_type,
          unit: product.unit,
          unit_price: Number(product.unit_price),
          stock_quantity: stock,
          quantity: 1,
        },
      ]
    })
    setCartOpen(true)
  }

  function updateCartQuantity(productId, delta) {
    setCart((currentCart) => currentCart.flatMap((item) => {
      if (item.product_id !== productId) return [item]
      const nextQuantity = item.quantity + delta
      if (nextQuantity <= 0) return []
      const maxQuantity = Number(item.stock_quantity || 0)
      return [{ ...item, quantity: Math.min(nextQuantity, maxQuantity) }]
    }))
  }

  function removeFromCart(productId) {
    setCart((currentCart) => currentCart.filter((item) => item.product_id !== productId))
  }

  async function handleCheckout(event) {
    event.preventDefault()

    if (cartItems.length === 0) {
      setCheckoutState({ loading: false, error: 'Add at least one product to the cart before checking out.', receipt: null })
      return
    }

    const trimmedPhone = checkoutForm.customerPhone.trim()
    if (!trimmedPhone) {
      setCheckoutState({ loading: false, error: 'Customer phone number is required.', receipt: null })
      return
    }

    setCheckoutState({ loading: true, error: '', receipt: null })

    try {
      const payload = {
        branch_id: Number(branchId),
        customer_phone: trimmedPhone,
        customer_name: checkoutForm.customerName.trim(),
        payment_mode: checkoutForm.paymentMode,
        items: cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
        })),
      }

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'The order could not be completed.')
      }

      setCheckoutState({ loading: false, error: '', receipt: result })
      setCart([])
      setCheckoutForm({ customerName: '', customerPhone: '', paymentMode: 'cash' })
      setCartOpen(false)
    } catch (checkoutError) {
      setCheckoutState({ loading: false, error: checkoutError.message, receipt: null })
    }
  }

  const orderReceipt = checkoutState.receipt

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AgriChoice home">
          <span className="brand-mark"><Leaf size={22} aria-hidden="true" /></span>
          <span>agri<span className="brand-accent">choice</span></span>
        </a>

        <div className="header-actions">
          <div className="view-switcher" aria-label="View selector">
            <button
              type="button"
              className={`view-button ${currentView === 'shop' ? 'view-button-active' : ''}`}
              onClick={() => setCurrentView('shop')}
            >
              Shop
            </button>
            <button
              type="button"
              className={`view-button ${currentView === 'admin' ? 'view-button-active' : ''}`}
              onClick={() => setCurrentView('admin')}
            >
              Admin
            </button>
          </div>

          <div className="branch-picker">
            <MapPin size={17} aria-hidden="true" />
            <label htmlFor="branch-select">Shopping from</label>
            <select
              id="branch-select"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              disabled={loadingBranches || branches.length === 0}
            >
              {loadingBranches && <option value="">Loading branches...</option>}
              {!loadingBranches && branches.length === 0 && <option value="">No branches found</option>}
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          {currentView === 'shop' && (
            <button type="button" className="cart-button" onClick={() => setCartOpen(true)}>
              <ShoppingCart size={18} aria-hidden="true" />
              <span>Cart</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          )}
        </div>
      </header>

      <main>
        {currentView === 'shop' ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow"><span className="eyebrow-dot" /> GOOD THINGS GROW HERE</span>
                <h1>From our farms<br />to your <em>table.</em></h1>
                <p>Discover fresh produce and locally made goods from the people who grow them.</p>
                <div className="hero-branch">
                  <MapPin size={16} aria-hidden="true" />
                  {selectedBranch ? `${selectedBranch.branch_name} · ${selectedBranch.location}` : 'Choose a branch to get started'}
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <span className="sun" />
                <span className="hero-leaf leaf-one">🌿</span>
                <span className="hero-leaf leaf-two">🍊</span>
                <span className="hero-leaf leaf-three">🍠</span>
                <span className="hero-leaf leaf-four">🌱</span>
              </div>
              <div className="hero-stats">
                <div><strong>{products.length}</strong><span>farm-fresh products</span></div>
                <div><strong>{availableCount}</strong><span>available today</span></div>
                <div><strong>{branches.length}</strong><span>local branches</span></div>
              </div>
            </section>

            <section className="catalog" aria-labelledby="catalog-heading">
              <div className="catalog-heading">
                <div>
                  <p className="section-kicker">GROWN WITH CARE</p>
                  <h2 id="catalog-heading">The good stuff.</h2>
                </div>
                <label className="search-box">
                  <Search size={18} aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Find a product..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>

              <div className="filter-row" aria-label="Filter products by category">
                {categories.map((item) => (
                  <button
                    className={`filter-button ${category === item.value ? 'filter-active' : ''}`}
                    key={item.value}
                    onClick={() => setCategory(item.value)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {error && (
                <div className="notice notice-error" role="alert">
                  <strong>We could not reach the catalog.</strong>
                  <span>{error} Make sure the API and SQLite database are running, then refresh.</span>
                </div>
              )}

              {checkoutState.error && (
                <div className="notice notice-error" role="alert">
                  <strong>Checkout error.</strong>
                  <span>{checkoutState.error}</span>
                </div>
              )}

              {orderReceipt && (
                <div className="notice notice-success" role="status">
                  <strong>Order confirmed.</strong>
                  <span>Receipt {orderReceipt.receipt_no} created successfully.</span>
                </div>
              )}

              {loadingBranches || loadingProducts ? (
                <div className="empty-state" role="status">Loading fresh picks...</div>
              ) : !error && visibleProducts.length === 0 ? (
                <div className="empty-state">
                  <span aria-hidden="true">🌾</span>
                  <h3>No products found</h3>
                  <p>Try a different search or category, or choose another branch.</p>
                </div>
              ) : (
                <div className="product-grid">
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.product_id} product={product} onAddToCart={handleAddToCart} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="admin-panel" aria-labelledby="admin-heading">
            <div className="admin-header">
              <div>
                <p className="section-kicker">OPERATIONS</p>
                <h2 id="admin-heading">Branch management</h2>
              </div>
            </div>

            <div className="admin-metrics">
              <div className="metric-card">
                <span>Daily sales</span>
                <strong>{salesLoading ? '...' : formatPrice(salesSummary.daily_revenue)}</strong>
              </div>
              <div className="metric-card">
                <span>Total orders</span>
                <strong>{salesLoading ? '...' : salesSummary.total_orders}</strong>
              </div>
              <div className="metric-card">
                <span>Low stock</span>
                <strong>{inventoryLoading ? '...' : lowStockCount}</strong>
              </div>
            </div>

            <div className="admin-grid">
              <div className="admin-table-card">
                <h3>Inventory snapshot</h3>
                {inventoryLoading ? (
                  <div className="empty-state compact-empty">Loading inventory...</div>
                ) : inventory.length === 0 ? (
                  <div className="empty-state compact-empty">No inventory data available.</div>
                ) : (
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Unit</th>
                        <th>Stock</th>
                        <th>Alert</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => {
                        const isLow = Number(item.stock_quantity || 0) <= Number(item.alert_threshold || 0)
                        return (
                          <tr key={item.product_id}>
                            <td>{item.product_name}</td>
                            <td>{item.unit}</td>
                            <td>{item.stock_quantity}</td>
                            <td>{item.alert_threshold}</td>
                            <td>
                              <span className={`stock-badge ${isLow ? 'stock-low' : 'stock-ready'}`}>
                                {isLow ? 'Low stock' : 'Healthy'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="restock-card">
                <h3>Recent sales</h3>
                {salesLoading ? (
                  <div className="empty-state compact-empty">Loading recent sales...</div>
                ) : salesSummary.orders.length === 0 ? (
                  <div className="empty-state compact-empty">No recent sales yet.</div>
                ) : (
                  <div className="sales-list">
                    {salesSummary.orders.map((order) => (
                      <div key={order.receipt_no} className="sales-item">
                        <div>
                          <strong>{order.receipt_no}</strong>
                          <span>{order.customer_name || order.customer_phone || 'Walk-in customer'}</span>
                        </div>
                        <div>
                          <strong>{formatPrice(order.total_amount)}</strong>
                          <span>{order.payment_status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="restock-card">
                <h3>Quick restock</h3>
                <form className="restock-form" onSubmit={handleRestock}>
                  <label>
                    Product
                    <select
                      value={restockForm.productId}
                      onChange={(event) => setRestockForm((current) => ({ ...current, productId: event.target.value }))}
                    >
                      <option value="">Choose a product</option>
                      {products.map((product) => (
                        <option key={product.product_id} value={product.product_id}>{product.product_name}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      value={restockForm.quantity}
                      onChange={(event) => setRestockForm((current) => ({ ...current, quantity: event.target.value }))}
                    />
                  </label>

                  <label>
                    Source
                    <select
                      value={restockForm.source}
                      onChange={(event) => setRestockForm((current) => ({ ...current, source: event.target.value }))}
                    >
                      <option value="harvested">Harvested</option>
                      <option value="acquired">Acquired</option>
                    </select>
                  </label>

                  <label>
                    Recorded by (optional)
                    <input
                      type="number"
                      min="1"
                      value={restockForm.recordedBy}
                      onChange={(event) => setRestockForm((current) => ({ ...current, recordedBy: event.target.value }))}
                      placeholder="Staff ID"
                    />
                  </label>

                  {restockState.error && (
                    <div className="notice notice-error restock-notice" role="alert">
                      <span>{restockState.error}</span>
                    </div>
                  )}

                  {restockState.success && (
                    <div className="notice notice-success restock-notice" role="status">
                      <span>{restockState.success}</span>
                    </div>
                  )}

                  <button type="submit" className="checkout-button" disabled={restockState.loading}>
                    {restockState.loading ? 'Restocking...' : 'Add stock'}
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>

      {cartOpen && (
        <div className="cart-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="cart-panel" onClick={(event) => event.stopPropagation()}>
            <div className="cart-header">
              <div>
                <p className="section-kicker cart-kicker">Your basket</p>
                <h3>{selectedBranch ? selectedBranch.branch_name : 'Branch basket'}</h3>
              </div>
              <button type="button" className="close-button" onClick={() => setCartOpen(false)} aria-label="Close cart">
                ×
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <span aria-hidden="true">🧺</span>
                <p>Your cart is empty. Add fresh stock to continue.</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cartItems.map((item) => (
                    <div key={item.product_id} className="cart-item">
                      <div>
                        <h4>{item.product_name}</h4>
                        <p>{item.unit} · {formatPrice(item.unit_price)}</p>
                      </div>
                      <div className="cart-item-controls">
                        <div className="quantity-stepper" aria-label={`Adjust quantity for ${item.product_name}`}>
                          <button type="button" onClick={() => updateCartQuantity(item.product_id, -1)} aria-label={`Decrease quantity for ${item.product_name}`}>
                            <Minus size={14} aria-hidden="true" />
                          </button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateCartQuantity(item.product_id, 1)} aria-label={`Increase quantity for ${item.product_name}`}>
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        </div>
                        <button type="button" className="icon-button" onClick={() => removeFromCart(item.product_id)} aria-label={`Remove ${item.product_name}`}>
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <form className="checkout-form" onSubmit={handleCheckout}>
                  <label>
                    Customer name
                    <input
                      type="text"
                      value={checkoutForm.customerName}
                      onChange={(event) => setCheckoutForm((current) => ({ ...current, customerName: event.target.value }))}
                      placeholder="Optional"
                    />
                  </label>

                  <label>
                    Phone number
                    <input
                      type="tel"
                      value={checkoutForm.customerPhone}
                      onChange={(event) => setCheckoutForm((current) => ({ ...current, customerPhone: event.target.value }))}
                      placeholder="e.g. +254712345678"
                      required
                    />
                  </label>

                  <label>
                    Payment mode
                    <select
                      value={checkoutForm.paymentMode}
                      onChange={(event) => setCheckoutForm((current) => ({ ...current, paymentMode: event.target.value }))}
                    >
                      <option value="cash">Cash</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="card">Card</option>
                      <option value="bank">Bank transfer</option>
                    </select>
                  </label>

                  <div className="order-summary">
                    <div>
                      <span>Subtotal</span>
                      <strong>{formatPrice(cartTotal)}</strong>
                    </div>
                    <div>
                      <span>Items</span>
                      <strong>{cartCount}</strong>
                    </div>
                  </div>

                  <button type="submit" className="checkout-button" disabled={checkoutState.loading}>
                    {checkoutState.loading ? 'Processing...' : 'Complete checkout'}
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      )}

      {orderReceipt && (
        <div className="receipt-modal" role="dialog" aria-modal="true" aria-label="Order receipt">
          <div className="receipt-card">
            <div className="receipt-header">
              <div>
                <p className="section-kicker">Receipt</p>
                <h3>{orderReceipt.receipt_no}</h3>
              </div>
              <button type="button" className="close-button" onClick={() => setCheckoutState((current) => ({ ...current, receipt: null }))} aria-label="Close receipt">
                ×
              </button>
            </div>

            <div className="receipt-meta">
              <span>{selectedBranch ? selectedBranch.branch_name : 'Branch'} </span>
              <span>{new Date(orderReceipt.order_date || Date.now()).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>

            <div className="receipt-items">
              {orderReceipt.items.map((item) => (
                <div key={item.product_id} className="receipt-line">
                  <span>{item.product_name} × {item.quantity}</span>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </div>
              ))}
            </div>

            <div className="receipt-total">
              <span>Total</span>
              <strong>{formatPrice(orderReceipt.total_amount)}</strong>
            </div>

            <div className="receipt-actions">
              <button type="button" className="secondary-button" onClick={() => window.print()}>Print / Save PDF</button>
              <button type="button" className="primary-button" onClick={() => setCheckoutState((current) => ({ ...current, receipt: null }))}>Close</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <a className="brand footer-brand" href="/">
          <span className="brand-mark"><Leaf size={18} aria-hidden="true" /></span>
          <span>agri<span className="brand-accent">choice</span></span>
        </a>
        <p>Good food, grown close to home.</p>
        <span>CFAR Agrichoice</span>
      </footer>
    </div>
  )
}

export default App
