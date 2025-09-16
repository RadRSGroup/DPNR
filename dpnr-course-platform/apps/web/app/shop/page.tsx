"use client";

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

const PRODUCTS: Product[] = [
  {
    id: 'cmfl2eeha000012b6nc9oxk5z',
    name: 'DPNR Development Fundamentals Textbook',
    price: 89,
    description: 'Complete guide to development fundamentals'
  },
  {
    id: 'cmfl2eehc000112b6tpej6yss',
    name: 'Advanced Development Patterns Textbook',
    price: 119,
    description: 'Advanced patterns and best practices'
  },
  {
    id: 'cmfl2eehd000212b65ve4sncp',
    name: 'DPNR Practice Exercises Workbook',
    price: 49,
    description: 'Hands-on practice exercises'
  },
  {
    id: 'cmfl2eehe000312b69c0d7fj1',
    name: 'Project Laboratory Workbook',
    price: 59,
    description: 'Real-world project exercises'
  }
];

export default function ShopPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  async function getCsrfToken() {
    try {
      const response = await fetch('/api/csrf');
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
    } catch {}
    return null;
  }

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'same-origin'
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(!!data.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }

  useEffect(() => {
    getCsrfToken();
    checkAuth();
  }, []);

  useEffect(() => {
    // Close cart dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      const cartDropdown = document.getElementById('cart-dropdown');
      const cartButton = document.getElementById('cart-button');
      if (cartDropdown && !cartDropdown.contains(event.target as Node) &&
          cartButton && !cartButton.contains(event.target as Node)) {
        setShowCart(false);
      }
    }

    if (showCart) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCart]);

  function addToCart(product: Product, quantity: number = 1) {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevCart, { productId: product.id, quantity, product }];
      }
    });
    // Close cart dropdown after adding item
    setShowCart(false);
  }

  function updateCartQuantity(productId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.productId === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  }

  function removeFromCart(productId: string) {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  }

  function getCartTotal() {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }

  function getCartItemCount() {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }

  async function checkout() {
    if (cart.length === 0) {
      setErr('Your cart is empty');
      return;
    }

    setMsg(null); setErr(null); setBusy(true);
    try {
      const token = (await getCsrfToken()) || document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))?.split('=')[1];

      const items = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-csrf-token': token } : {}),
        },
        credentials: 'same-origin', // Ensure cookies are sent
        body: JSON.stringify({
          items,
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "050-1234567"
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          // Re-check authentication status
          await checkAuth();
          if (res.status === 401) {
            throw new Error('Session expired. Please login again by clicking the Login button.');
          }
          throw new Error('Authentication failed. Please try logging out and back in again.');
        }
        throw new Error(errorData.error || `Checkout failed (${res.status}). Please try again or contact support.`);
      }

      const data = await res.json();

      if (data.success && data.redirectUrl) {
        setMsg(`Payment session created! Redirecting to Tranzila...`);
        // Redirect to Tranzila payment page
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1000);
      } else {
        throw new Error('Invalid response from checkout');
      }
    } catch (e: any) {
      setErr(e?.message || 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="p-8 max-w-6xl mx-auto">
      {/* Header with Cart */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">DPNR Course Materials</h1>
          <p className="text-gray-600">Purchase textbooks and workbooks for the DPNR development course</p>
        </div>
        <div className="relative">
          <button
            id="cart-button"
            onClick={() => setShowCart(!showCart)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🛒 Cart ({getCartItemCount()})
            <span className="text-sm">₪{getCartTotal()}</span>
          </button>

          {/* Cart Dropdown */}
          {showCart && (
            <div id="cart-dropdown" className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-10">
              <div className="p-4">
                <h3 className="font-semibold mb-3">Shopping Cart</h3>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-sm">Your cart is empty</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between text-sm">
                        <div className="flex-1">
                          <div className="font-medium truncate">{item.product.name}</div>
                          <div className="text-gray-500">₪{item.product.price} each</div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-gray-600"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-gray-600"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between font-semibold">
                        <span>Total: ₪{getCartTotal()}</span>
                      </div>
                      <button
                        onClick={checkout}
                        disabled={busy || cart.length === 0}
                        className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {busy ? 'Processing...' : 'Checkout with Tranzila'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info banner - only show if not authenticated */}
      {isAuthenticated === false && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <div>
              <strong>Note:</strong> You need to{' '}
              <a href="/auth/login" className="underline hover:text-blue-600">login</a>{' '}
              to complete purchases. You can browse and add items to your cart without logging in.
            </div>
          </div>
        </div>
      )}

      {/* Success banner - show if authenticated */}
      {isAuthenticated === true && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <div>
              <strong>Ready to shop!</strong> You're logged in and can complete purchases.
            </div>
          </div>
        </div>
      )}

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{err}</div>}

      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl">
        {PRODUCTS.map((product) => (
          <div key={product.id} className="border rounded-lg p-6 bg-white shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{product.description}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-2xl font-bold text-blue-600">
                ₪{product.price}
              </div>
              <div className="flex items-center gap-3">
                {/* Quantity Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Qty:</label>
                  <select
                    className="border rounded px-2 py-1 text-sm w-16"
                    id={`qty-${product.id}`}
                    defaultValue="1"
                  >
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    const select = document.getElementById(`qty-${product.id}`) as HTMLSelectElement;
                    const quantity = parseInt(select.value);
                    addToCart(product, quantity);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-center"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Payment Information</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>💳 Payments processed securely through Tranzila</p>
          <p>🇮🇱 Israeli Shekel (ILS) pricing</p>
          <p>🔒 SSL encrypted checkout process</p>
          <p>📧 Receipt sent to your email after payment</p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Need to login? <a href="/auth/login" className="text-blue-600 hover:underline">Sign in here</a>
        </p>
      </div>
    </main>
  );
}
