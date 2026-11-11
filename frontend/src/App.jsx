import { useEffect, useMemo, useState } from 'react'
import { Leaf, MapPin, PackageCheck, Search } from 'lucide-react'
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

function ProductCard({ product }) {
  const art = productArt[product.product_type] || {
    emoji: '🌱',
    className: 'art-default',
    label: 'Farm produce',
  }
  const quantity = Number(product.stock_quantity || 0)
  const isLow = quantity > 0 && quantity <= Number(product.alert_threshold || 0)

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
          <p className="quantity">
            <PackageCheck size={16} aria-hidden="true" />
            {quantity} {product.unit} available
          </p>
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
    if (!branchId) {
      return
    }

    const controller = new AbortController()

    async function loadProducts() {
      setLoadingProducts(true)
      setError('')
      try {
        const query = new URLSearchParams({ branch_id: branchId })
        const response = await fetch(`${API_URL}/products?${query}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Could not load products for this branch.')
        setProducts(await response.json())
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setLoadingProducts(false)
      }
    }

    loadProducts()
    return () => controller.abort()
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AgriChoice home">
          <span className="brand-mark"><Leaf size={22} aria-hidden="true" /></span>
          <span>agri<span className="brand-accent">choice</span></span>
        </a>
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
      </header>

      <main>
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
              <span>{error} Make sure the API and PostgreSQL are running, then refresh.</span>
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
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

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
