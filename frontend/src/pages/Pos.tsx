import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { offlineStorage } from '../services/db';
import { useSettings } from '../context/SettingsContext';
import { useSync } from '../context/SyncContext';
import { Product, Category, CartItem, Order, CustomerType, PaymentMethod } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import { UpiQrModal } from '../components/UpiQrModal';
import { printOrderReceipt } from '../services/printer';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  QrCode,
  Banknote,
  CreditCard,
  Percent,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Coffee,
  UtensilsCrossed,
  Cookie,
  CupSoda,
  Citrus,
  IceCream,
  CircleDot,
  ShoppingBag
} from 'lucide-react';

export const Pos: React.FC = () => {
  const { settings } = useSettings();
  const { isOnline, refreshPendingCount } = useSync();

  // Catalog State
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Student/Staff');
  const [customerType, setCustomerType] = useState<CustomerType>('student');
  const [orderNotes, setOrderNotes] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');

  // Submission & Modal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const currency = settings.currency_symbol || '₹';

  // Load Categories & Products (with offline fallback from IndexedDB)
  useEffect(() => {
    async function loadCatalog() {
      setIsLoadingCatalog(true);
      try {
        const [catRes, prodRes] = await Promise.all([
          api.getCategories(),
          api.getProducts({ available_only: true })
        ]);

        if (catRes.success) {
          setCategories(catRes.data);
          await offlineStorage.cacheCatalog('categories', catRes.data);
        }
        if (prodRes.success) {
          setProducts(prodRes.data);
          await offlineStorage.cacheCatalog('products', prodRes.data);
        }
      } catch (err) {
        console.warn('Network catalog load failed, checking offline cache...');
        const cachedCats = await offlineStorage.getCachedCatalog('categories');
        const cachedProds = await offlineStorage.getCachedCatalog('products');
        if (cachedCats) setCategories(cachedCats);
        if (cachedProds) setProducts(cachedProds);
      } finally {
        setIsLoadingCatalog(false);
      }
    }

    loadCatalog();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory = selectedCategory === null || prod.category_id === selectedCategory;
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        prod.name.toLowerCase().includes(term) ||
        (prod.local_name && prod.local_name.toLowerCase().includes(term)) ||
        (prod.code && prod.code.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            local_name: product.local_name,
            quantity: 1,
            unit_price: Number(product.selling_price),
            unit_cost: Number(product.cost_price),
            food_type: product.food_type
          }
        ];
      }
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setCashTendered('');
    setOrderNotes('');
    setErrorMessage(null);
  };

  // Calculations
  const cartTotalCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const rawSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return (rawSubtotal * Math.min(100, Math.max(0, discountValue))) / 100;
    }
    return Math.min(rawSubtotal, Math.max(0, discountValue));
  }, [rawSubtotal, discountType, discountValue]);

  const afterDiscount = Math.max(0, rawSubtotal - discountAmount);
  const taxRate = parseFloat(settings.tax_percentage) || 5.0;
  const isTaxInclusive = settings.tax_inclusive !== 'false';

  const { taxAmount, grandTotal } = useMemo(() => {
    let tax = 0;
    let total = 0;

    if (isTaxInclusive) {
      if (taxRate > 0) {
        const taxable = afterDiscount / (1 + taxRate / 100);
        tax = afterDiscount - taxable;
      }
      total = afterDiscount;
    } else {
      tax = (afterDiscount * taxRate) / 100;
      total = afterDiscount + tax;
    }

    return {
      taxAmount: Math.round((tax + Number.EPSILON) * 100) / 100,
      grandTotal: Math.round((total + Number.EPSILON) * 100) / 100
    };
  }, [afterDiscount, taxRate, isTaxInclusive]);

  // Cash Change Calculation
  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered);
    if (isNaN(tendered) || tendered < grandTotal) return 0;
    return Math.round((tendered - grandTotal + Number.EPSILON) * 100) / 100;
  }, [cashTendered, grandTotal]);

  // Order Submission (Online + Offline Resilient)
  const handleCheckout = async (autoPrint = true) => {
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Please add items to bill.');
      return;
    }

    if (paymentMethod === 'upi' && !isUpiModalOpen && autoPrint) {
      // Trigger dynamic UPI QR screen first so customer can scan at counter
      setIsUpiModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const orderPayload = {
      items: cart,
      customer_name: customerName.trim() || 'Walk-in Student/Staff',
      customer_type: customerType,
      discount_type: discountType,
      discount_value: discountValue,
      tax_rate: taxRate,
      is_tax_inclusive: isTaxInclusive,
      payment_method: paymentMethod,
      notes: orderNotes.trim() || null,
      subtotal: rawSubtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal
    };

    try {
      let createdOrder: Order;

      if (navigator.onLine) {
        // Online: directly create in MySQL database
        const res = await api.createOrder(orderPayload);
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Server error creating order.');
        }
        createdOrder = res.data;
      } else {
        // Offline: save to IndexedDB queue with unique offline ID
        const offlineId = await offlineStorage.saveOfflineOrder(orderPayload);
        await refreshPendingCount();

        // Construct offline order object for immediate printing and display
        createdOrder = {
          id: Date.now(),
          bill_number: `OFF-${Date.now().toString().slice(-6)}`,
          order_date: new Date().toISOString(),
          customer_name: orderPayload.customer_name,
          customer_type: customerType,
          token_number: Math.floor(Math.random() * 800) + 100,
          subtotal: rawSubtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          payment_method: paymentMethod,
          payment_status: 'paid',
          order_status: 'completed',
          items: cart.map((c, i) => ({
            id: i + 1,
            product_name: c.product_name,
            quantity: c.quantity,
            unit_price: c.unit_price,
            unit_cost: c.unit_cost,
            subtotal: c.unit_price * c.quantity
          })),
          offline_id: offlineId,
          is_synced: false
        };
      }

      setCompletedOrder(createdOrder);
      setSuccessBanner(`Bill #${createdOrder.bill_number} generated successfully!`);
      clearCart();

      // Trigger thermal receipt print if requested
      if (autoPrint) {
        printOrderReceipt(createdOrder, settings).catch((err) => {
          console.warn('Auto print failed:', err);
        });
        setIsReceiptModalOpen(true);
      }
    } catch (err: any) {
      console.error('Order creation failed:', err);
      setErrorMessage(err.message || 'Failed to process order. Please check network.');
    } finally {
      setIsSubmitting(false);
      setIsUpiModalOpen(false);
    }
  };

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Coffee': return <Coffee className="w-4 h-4" />;
      case 'UtensilsCrossed': return <UtensilsCrossed className="w-4 h-4" />;
      case 'Cookie': return <Cookie className="w-4 h-4" />;
      case 'CupSoda': return <CupSoda className="w-4 h-4" />;
      case 'Citrus': return <Citrus className="w-4 h-4" />;
      case 'IceCream': return <IceCream className="w-4 h-4" />;
      default: return <UtensilsCrossed className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto min-h-[calc(100vh-5rem)]">
      {/* Mobile/Tablet View Switcher Tabs (Hidden on Desktop) */}
      <div className="lg:hidden flex items-center bg-white p-1.5 rounded-2xl border border-cream-200 shadow-xs">
        <button
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            mobileTab === 'menu' ? 'bg-suvai-green-900 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Food Menu ({filteredProducts.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all relative ${
            mobileTab === 'cart' ? 'bg-suvai-green-900 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Active Bill</span>
          {cartTotalCount > 0 && (
            <span className="bg-suvai-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold ml-1">
              {cartTotalCount} | {currency}{grandTotal.toFixed(0)}
            </span>
          )}
        </button>
      </div>

      {/* LEFT: Food Items Grid & Category Filters (70% on desktop) */}
      <div className={`${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'} flex-1 flex-col space-y-4`}>
        {/* Search & Feedback Banner */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food by name, Tamil label or code (e.g., Momos, Rolls, Dosa)..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-cream-200 rounded-2xl text-sm font-medium shadow-xs focus:outline-hidden focus:border-suvai-green-700 focus:ring-2 focus:ring-suvai-green-200 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Success / Error Alerts */}
        {successBanner && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <div className="flex items-center gap-2">
              {completedOrder && (
                <button
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="px-3 py-1.5 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-suvai-orange-400" />
                  <span>Print Receipt Slip</span>
                </button>
              )}
              <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 hover:underline text-xs">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Touch Category Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs flex items-center space-x-1.5 touch-press ${
              selectedCategory === null
                ? 'bg-suvai-green-900 text-white shadow-suvai-green-950/20'
                : 'bg-white text-stone-700 border border-cream-200 hover:bg-cream-100'
            }`}
          >
            <span>All Menu</span>
            <span className="text-[10px] bg-black/15 px-1.5 py-0.5 rounded-full ml-1">
              {products.length}
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs flex items-center space-x-2 touch-press ${
                  isSelected
                    ? 'bg-suvai-green-900 text-white shadow-suvai-green-950/20'
                    : 'bg-white text-stone-700 border border-cream-200 hover:bg-cream-100'
                }`}
              >
                <span className={isSelected ? 'text-suvai-orange-400' : 'text-stone-500'}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {cat.local_name && (
                  <span className={`text-[10px] hidden sm:inline ${isSelected ? 'text-cream-200' : 'text-stone-400'}`}>
                    ({cat.local_name})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Food Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isLoadingCatalog ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-2">
              <RefreshCw className="w-8 h-8 text-suvai-green-800 animate-spin" />
              <p className="text-xs font-semibold text-stone-500">Loading delicious canteen dishes...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map((product) => {
                const inCartItem = cart.find((i) => i.product_id === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group bg-white rounded-2xl p-4 border border-cream-200 hover:border-suvai-green-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between select-none active:scale-[0.98] relative overflow-hidden"
                  >
                    {/* Food Type Indicator (Veg green / Non-veg brown / Beverage blue) */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center ${
                            product.food_type === 'veg'
                              ? 'border-emerald-600'
                              : product.food_type === 'non-veg'
                              ? 'border-rose-700'
                              : 'border-sky-600'
                          }`}
                          title={product.food_type.toUpperCase()}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.food_type === 'veg'
                                ? 'bg-emerald-600'
                                : product.food_type === 'non-veg'
                                ? 'bg-rose-700'
                                : 'bg-sky-600'
                            }`}
                          />
                        </span>
                        {product.code && (
                          <span className="text-[10px] font-mono text-stone-400 uppercase">
                            {product.code}
                          </span>
                        )}
                      </div>

                      {inCartItem && (
                        <span className="w-6 h-6 rounded-full bg-suvai-orange-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                          {inCartItem.quantity}
                        </span>
                      )}
                    </div>

                    {/* Dish Name */}
                    <div className="space-y-0.5 mb-3">
                      <h4 className="font-extrabold text-stone-900 text-sm leading-snug group-hover:text-suvai-green-900 transition-colors">
                        {product.name}
                      </h4>
                      {product.local_name && (
                        <p className="text-[11px] font-medium text-stone-500">
                          {product.local_name}
                        </p>
                      )}
                    </div>

                    {/* Price & Add Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-cream-100">
                      <span className="font-black text-base text-suvai-green-950">
                        {currency}{Number(product.selling_price).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="w-8 h-8 rounded-xl bg-cream-100 group-hover:bg-suvai-green-900 text-stone-700 group-hover:text-white flex items-center justify-center transition-colors shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-cream-200">
              <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <h4 className="font-bold text-stone-700 text-sm">No food items matched your query</h4>
              <p className="text-xs text-stone-500 mt-1">Try another category pill or clear search filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Touch Billing & Cart Terminal Panel (30% on desktop) */}
      <div className={`${mobileTab === 'menu' ? 'hidden lg:flex' : 'flex'} w-full lg:w-[420px] bg-white rounded-3xl border border-cream-200 shadow-xl shadow-stone-200/40 flex flex-col overflow-hidden`}>
        {/* Panel Header */}
        <div className="p-4 bg-suvai-green-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-suvai-orange-400 animate-pulse"></span>
            <h3 className="font-black text-base tracking-tight">Active Bill</h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] font-bold text-cream-300 hover:text-white bg-suvai-green-900 hover:bg-suvai-green-800 px-2.5 py-1 rounded-lg transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Customer Quick Selector */}
        <div className="p-3 bg-cream-50 border-b border-cream-200 space-y-2">
          <div className="flex items-center space-x-2">
            {(['student', 'staff', 'visitor'] as CustomerType[]).map((type) => (
              <button
                key={type}
                onClick={() => setCustomerType(type)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  customerType === type
                    ? 'bg-suvai-green-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-cream-200 hover:bg-cream-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Student / Staff Name or ID"
            className="w-full px-3 py-1.5 text-xs bg-white border border-cream-200 rounded-lg text-stone-800 focus:outline-hidden focus:border-suvai-green-700 font-medium"
          />
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-cream-100 min-h-[220px] max-h-[360px]">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 truncate">{item.product_name}</p>
                  <p className="text-[11px] text-stone-500 font-medium">
                    {currency}{item.unit_price.toFixed(2)} each
                  </p>
                </div>

                {/* Qty +/- buttons */}
                <div className="flex items-center space-x-1.5 bg-cream-100 p-1 rounded-xl">
                  <button
                    onClick={() => updateQuantity(item.product_id!, -1)}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-cream-200 text-stone-800 flex items-center justify-center transition-colors shadow-xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-stone-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product_id!, 1)}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-cream-200 text-stone-800 flex items-center justify-center transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right min-w-[65px]">
                  <p className="text-xs font-black text-stone-900">
                    {currency}{(item.unit_price * item.quantity).toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.product_id!)}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-stone-400">
              <ShoppingBag className="w-10 h-10 mb-2 text-stone-300" />
              <p className="text-xs font-bold text-stone-600">Cart is empty</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Click any food card on the left to add items</p>
            </div>
          )}
        </div>

        {/* Cart Summary & Discount Bar */}
        <div className="p-4 bg-cream-50 border-t border-cream-200 space-y-2.5">
          {/* Discount input */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Percent className="w-3.5 h-3.5 text-suvai-orange-600" />
              <span className="font-bold text-stone-600">Discount:</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setDiscountType(discountType === 'flat' ? 'percent' : 'flat')}
                className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-white border border-cream-300 text-stone-700 uppercase"
              >
                {discountType === 'flat' ? currency : '%'}
              </button>
              <input
                type="number"
                min="0"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-16 px-2 py-0.5 text-xs text-right bg-white border border-cream-200 rounded text-stone-800 font-bold"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs pt-1 border-t border-cream-200">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{currency}{rawSubtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-suvai-orange-700 font-semibold">
                <span>Discount:</span>
                <span>-{currency}{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>Tax ({taxRate}% {isTaxInclusive ? 'Inclusive GST' : 'Exclusive GST'}):</span>
              <span>{currency}{taxAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-lg font-black text-stone-900 pt-1 border-t border-cream-300">
              <span>Grand Total:</span>
              <span className="text-suvai-green-950">{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-suvai-green-900 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-cream-200 hover:bg-cream-100'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                onClick={() => setPaymentMethod('upi')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'upi'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-cream-200 hover:bg-cream-100'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI Pay</span>
              </button>

              <button
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-cream-200 hover:bg-cream-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card/Other</span>
              </button>
            </div>
          </div>

          {/* Cash Tendered & Change Return Calculator */}
          {paymentMethod === 'cash' && grandTotal > 0 && (
            <div className="p-2.5 rounded-xl bg-white border border-cream-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-600">Cash Received:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-stone-500">{currency}</span>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={String(grandTotal)}
                    className="w-20 px-2 py-1 text-xs text-right font-black bg-cream-50 border border-stone-200 rounded-lg text-stone-900"
                  />
                </div>
              </div>

              {changeDue > 0 && (
                <div className="flex justify-between items-center text-xs pt-1 border-t border-cream-100 font-extrabold text-emerald-800">
                  <span>Return Change:</span>
                  <span className="text-sm">{currency}{changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Main Action Buttons: Complete & Print */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleCheckout(true)}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-3.5 px-4 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg shadow-suvai-green-950/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Bill...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-suvai-orange-400" />
                  <span>Charge & Print Receipt</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleCheckout(false)}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Complete Bill Without Printing
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Counter UPI QR Code Modal */}
      <UpiQrModal
        isOpen={isUpiModalOpen}
        amount={grandTotal}
        upiVpa={settings.upi_vpa || 'suvaicanteen@okaxis'}
        merchantName={settings.upi_merchant_name || 'Suvai Canteen'}
        currencySymbol={currency}
        onConfirm={() => {
          setIsUpiModalOpen(false);
          handleCheckout(true);
        }}
        onCancel={() => setIsUpiModalOpen(false)}
      />

      {/* Thermal Receipt Preview & Reprint Modal */}
      <ReceiptModal
        order={completedOrder}
        settings={settings}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      {/* Floating Bottom Cart Bar for Tablet & Mobile */}
      {cartTotalCount > 0 && mobileTab === 'menu' && (
        <div className="lg:hidden fixed bottom-18 left-3 right-3 z-30 bg-suvai-green-950 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between border border-suvai-green-800 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-suvai-orange-500 flex items-center justify-center font-black text-sm text-white shadow-sm">
              {cartTotalCount}
            </div>
            <div>
              <p className="text-[11px] text-cream-300 font-medium">Bill Subtotal</p>
              <p className="text-sm font-black text-white">{currency}{grandTotal.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileTab('cart')}
            className="bg-suvai-orange-500 hover:bg-suvai-orange-400 active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <span>Review & Pay</span>
            ➔
          </button>
        </div>
      )}
    </div>
  );
};
