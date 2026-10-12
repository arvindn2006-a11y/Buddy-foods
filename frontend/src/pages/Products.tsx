import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { Product, Category, FoodType } from '../types';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  UtensilsCrossed,
  FolderPlus,
  X,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const Products: React.FC = () => {
  const { settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Product Form State
  const [formData, setFormData] = useState({
    name: '',
    local_name: '',
    code: '',
    category_id: 1,
    selling_price: '',
    cost_price: '',
    food_type: 'veg' as FoodType,
    preparation_time_mins: 5,
    is_available: true
  });

  // Category Form State
  const [catFormData, setCatFormData] = useState({
    name: '',
    local_name: '',
    icon: 'UtensilsCrossed',
    color: '#166534',
    display_order: 1
  });

  const currency = settings.currency_symbol || '₹';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        api.getCategories(),
        api.getProducts()
      ]);
      if (catsRes.success) setCategories(catsRes.data);
      if (prodsRes.success) setProducts(prodsRes.data);
    } catch (err: any) {
      setBannerMessage({ text: 'Failed to load menu: ' + err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewProductModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      local_name: '',
      code: '',
      category_id: categories[0]?.id || 1,
      selling_price: '',
      cost_price: '',
      food_type: 'veg',
      preparation_time_mins: 5,
      is_available: true
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      local_name: prod.local_name || '',
      code: prod.code || '',
      category_id: prod.category_id,
      selling_price: String(prod.selling_price),
      cost_price: String(prod.cost_price || 0),
      food_type: prod.food_type,
      preparation_time_mins: prod.preparation_time_mins,
      is_available: !!prod.is_available
    });
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        setBannerMessage({ text: 'Food item updated successfully!', type: 'success' });
      } else {
        await api.createProduct(formData);
        setBannerMessage({ text: 'New food item added to menu!', type: 'success' });
      }
      setIsProductModalOpen(false);
      loadData();
    } catch (err: any) {
      setBannerMessage({ text: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleToggleStock = async (prod: Product) => {
    try {
      const res = await api.toggleProductStock(prod.id);
      if (res.success) {
        setProducts(prev =>
          prev.map(p => (p.id === prod.id ? { ...p, is_available: res.is_available } : p))
        );
      }
    } catch (err: any) {
      setBannerMessage({ text: 'Failed to update stock status', type: 'error' });
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this food item?')) return;
    try {
      await api.deleteProduct(id);
      setBannerMessage({ text: 'Product deleted from canteen menu.', type: 'success' });
      loadData();
    } catch (err: any) {
      setBannerMessage({ text: err.message || 'Failed to delete product', type: 'error' });
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, catFormData);
      } else {
        await api.createCategory(catFormData);
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      loadData();
    } catch (err: any) {
      setBannerMessage({ text: err.message || 'Category update failed', type: 'error' });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCatId === null || p.category_id === selectedCatId;
    const term = search.toLowerCase().trim();
    const matchesSearch = !term || p.name.toLowerCase().includes(term) || (p.local_name && p.local_name.toLowerCase().includes(term));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Food Menu & Stock Management</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage canteen dishes, selling rates, ingredient costs, and real-time counter stock availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingCategory(null);
              setCatFormData({ name: '', local_name: '', icon: 'UtensilsCrossed', color: '#166534', display_order: categories.length + 1 });
              setIsCategoryModalOpen(true);
            }}
            className="px-4 py-2.5 bg-cream-100 hover:bg-cream-200 text-stone-800 text-xs font-bold rounded-xl border border-cream-200 flex items-center space-x-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-suvai-green-800" />
            <span>Add Category</span>
          </button>

          <button
            onClick={openNewProductModal}
            className="px-5 py-2.5 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Food Item</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
          bannerMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          <span>{bannerMessage.text}</span>
          <button onClick={() => setBannerMessage(null)} className="underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCatId === null
                ? 'bg-suvai-green-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-cream-200 hover:bg-cream-100'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCatId === c.id
                  ? 'bg-suvai-green-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-cream-200 hover:bg-cream-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-cream-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-suvai-green-700"
          />
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-200 text-stone-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Type</th>
                <th className="py-3.5 px-4 font-bold">Item Name & Tamil Label</th>
                <th className="py-3.5 px-4 font-bold">Category</th>
                <th className="py-3.5 px-4 font-bold text-right">Selling Price</th>
                <th className="py-3.5 px-4 font-bold text-right">Cost Price (COGS)</th>
                <th className="py-3.5 px-4 font-bold text-center">Counter Stock</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(prod => (
                  <tr key={prod.id} className="hover:bg-cream-50/50 transition-colors">
                    {/* Food Type Indicator */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded-xs ${
                          prod.food_type === 'veg'
                            ? 'border-emerald-600'
                            : prod.food_type === 'non-veg'
                            ? 'border-rose-700'
                            : 'border-sky-600'
                        }`}
                        title={prod.food_type}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.food_type === 'veg'
                              ? 'bg-emerald-600'
                              : prod.food_type === 'non-veg'
                              ? 'bg-rose-700'
                              : 'bg-sky-600'
                          }`}
                        />
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-stone-900">{prod.name}</div>
                      {prod.local_name && (
                        <div className="text-[11px] text-stone-500 font-medium">{prod.local_name}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-stone-600 font-medium">
                      {prod.category_name || categories.find(c => c.id === prod.category_id)?.name || 'General'}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3 px-4 font-black text-suvai-green-950 text-right text-sm">
                      {currency}{Number(prod.selling_price).toFixed(2)}
                    </td>

                    {/* Cost Price */}
                    <td className="py-3 px-4 font-bold text-stone-600 text-right">
                      {currency}{Number(prod.cost_price || 0).toFixed(2)}
                    </td>

                    {/* Stock Quick Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStock(prod)}
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase transition-all shadow-2xs ${
                          prod.is_available
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                            : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                        }`}
                        title="Click to toggle stock availability"
                      >
                        {prod.is_available ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Available</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Sold Out</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openEditProductModal(prod)}
                          className="p-1.5 text-stone-600 hover:text-suvai-green-900 hover:bg-cream-100 rounded-lg transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400 italic">
                    No menu items found. Click "Add Food Item" above to add dishes!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-cream-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-cream-200">
              <h3 className="font-extrabold text-lg text-stone-900">
                {editingProduct ? 'Edit Food Item' : 'Add New Food Item'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Ghee Podi Dosa"
                  className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-suvai-green-700"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Tamil / Regional Name</label>
                <input
                  type="text"
                  value={formData.local_name}
                  onChange={e => setFormData({ ...formData, local_name: e.target.value })}
                  placeholder="e.g., நெய் பொடி தோசை"
                  className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-suvai-green-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-suvai-green-700"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Dietary Type *</label>
                  <select
                    value={formData.food_type}
                    onChange={e => setFormData({ ...formData, food_type: e.target.value as FoodType })}
                    className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-suvai-green-700"
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                    <option value="beverage">Beverage</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Selling Price ({currency}) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.selling_price}
                    onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="50.00"
                    className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-bold text-suvai-green-950 focus:outline-hidden focus:border-suvai-green-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Cost Price / COGS ({currency}) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.cost_price}
                    onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="20.00"
                    className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-bold text-stone-700 focus:outline-hidden focus:border-suvai-green-700"
                  />
                  <p className="text-[10px] text-stone-400 mt-0.5">Used for Net Profit formula</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="modal-stock"
                  checked={formData.is_available}
                  onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4 rounded text-suvai-green-900"
                />
                <label htmlFor="modal-stock" className="text-xs font-semibold text-stone-800">
                  Item is currently in-stock and available at counter
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 bg-cream-100 hover:bg-cream-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white bg-suvai-green-900 hover:bg-suvai-green-800 font-bold shadow-xs"
                >
                  {editingProduct ? 'Update Dish' : 'Save Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-cream-200">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h3 className="font-extrabold text-base text-stone-900">
                {editingCategory ? 'Edit Category' : 'Create Food Category'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catFormData.name}
                  onChange={e => setCatFormData({ ...catFormData, name: e.target.value })}
                  placeholder="e.g., Quick Tiffin"
                  className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Tamil / Regional Name</label>
                <input
                  type="text"
                  value={catFormData.local_name}
                  onChange={e => setCatFormData({ ...catFormData, local_name: e.target.value })}
                  placeholder="e.g., சிற்றுண்டி"
                  className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Display Order</label>
                <input
                  type="number"
                  value={catFormData.display_order}
                  onChange={e => setCatFormData({ ...catFormData, display_order: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 bg-cream-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-suvai-green-900 font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
