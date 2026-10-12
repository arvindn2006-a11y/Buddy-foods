import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  Layers,
  LayoutGrid,
  List,
  Coffee,
  Cookie,
  CupSoda,
  Citrus,
  IceCream,
  Zap,
  Check
} from 'lucide-react';

interface WizardItem {
  name: string;
  local_name: string;
  code: string;
  selling_price: string;
  food_type: FoodType;
}

export const Products: React.FC = () => {
  const { settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'headings' | 'table'>('headings');

  // Modals State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isQuickWizardOpen, setIsQuickWizardOpen] = useState(false);
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
    color: '#EA580C',
    display_order: 1
  });

  // Quick Heading & 4 Types Wizard State
  const [wizardData, setWizardData] = useState<{
    categoryName: string;
    localName: string;
    icon: string;
    color: string;
    items: WizardItem[];
  }>({
    categoryName: '',
    localName: '',
    icon: 'UtensilsCrossed',
    color: '#EA580C',
    items: [
      { name: '', local_name: '', code: '', selling_price: '', food_type: 'veg' },
      { name: '', local_name: '', code: '', selling_price: '', food_type: 'veg' },
      { name: '', local_name: '', code: '', selling_price: '', food_type: 'veg' },
      { name: '', local_name: '', code: '', selling_price: '', food_type: 'veg' }
    ]
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

  const openNewProductModal = (preselectedCatId?: number) => {
    setEditingProduct(null);
    setFormData({
      name: '',
      local_name: '',
      code: '',
      category_id: preselectedCatId || (selectedCatId ?? categories[0]?.id) || 1,
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

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCatFormData({
      name: cat.name,
      local_name: cat.local_name || '',
      icon: cat.icon || 'UtensilsCrossed',
      color: cat.color || '#EA580C',
      display_order: cat.display_order || 1
    });
    setIsCategoryModalOpen(true);
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
        setBannerMessage({ text: 'Category updated successfully!', type: 'success' });
      } else {
        await api.createCategory(catFormData);
        setBannerMessage({ text: 'New category created successfully!', type: 'success' });
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      loadData();
    } catch (err: any) {
      setBannerMessage({ text: err.message || 'Category update failed', type: 'error' });
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Delete heading "${name}"? Items under this category may become uncategorized.`)) return;
    try {
      await api.deleteCategory(id);
      setBannerMessage({ text: `Category "${name}" removed.`, type: 'success' });
      loadData();
    } catch (err: any) {
      setBannerMessage({ text: err.message || 'Failed to delete category', type: 'error' });
    }
  };

  // Quick Wizard Presets (e.g., Momos 4 types, Rolls 4 types)
  const applyPreset = (preset: 'momos' | 'rolls' | 'sandwiches' | 'burgers') => {
    if (preset === 'momos') {
      setWizardData({
        categoryName: 'Momos Corner',
        localName: 'மோமோஸ்',
        icon: 'UtensilsCrossed',
        color: '#EA580C',
        items: [
          { name: 'Steamed Veg Momos (6 Pcs)', local_name: 'ஸ்டீம்ட் மோமோஸ்', code: 'MO01', selling_price: '60', food_type: 'veg' },
          { name: 'Crispy Fried Veg Momos (6 Pcs)', local_name: 'ஃப்ரைட் மோமோஸ்', code: 'MO02', selling_price: '70', food_type: 'veg' },
          { name: 'Peri Peri Tossed Momos (6 Pcs)', local_name: 'பெரி பெரி மோமோஸ்', code: 'MO03', selling_price: '80', food_type: 'veg' },
          { name: 'Paneer Fried Momos (6 Pcs)', local_name: 'பன்னீர் மோமோஸ்', code: 'MO04', selling_price: '90', food_type: 'veg' }
        ]
      });
    } else if (preset === 'rolls') {
      setWizardData({
        categoryName: 'Rolls & Kathi Wraps',
        localName: 'ரோல்ஸ்',
        icon: 'Cookie',
        color: '#D97706',
        items: [
          { name: 'Classic Veg Kathi Roll', local_name: 'வெஜ் காதி ரோல்', code: 'RO01', selling_price: '50', food_type: 'veg' },
          { name: 'Paneer Tikka Roll', local_name: 'பன்னீர் டிக்கா ரோல்', code: 'RO02', selling_price: '70', food_type: 'veg' },
          { name: 'Egg Double Kathi Roll', local_name: 'முட்டை ரோல்', code: 'RO03', selling_price: '60', food_type: 'non-veg' },
          { name: 'Chicken Tikka Roll', local_name: 'சிக்கன் டிக்கா ரோல்', code: 'RO04', selling_price: '85', food_type: 'non-veg' }
        ]
      });
    } else if (preset === 'sandwiches') {
      setWizardData({
        categoryName: 'Grilled Sandwiches',
        localName: 'சாண்ட்விச்',
        icon: 'UtensilsCrossed',
        color: '#15803D',
        items: [
          { name: 'Veg Cheese Grilled Sandwich', local_name: 'சீஸ் சாண்ட்விச்', code: 'SW01', selling_price: '60', food_type: 'veg' },
          { name: 'Corn & Mayo Sandwich', local_name: 'கார்ன் சாண்ட்விச்', code: 'SW02', selling_price: '65', food_type: 'veg' },
          { name: 'Paneer Masala Sandwich', local_name: 'பன்னீர் சாண்ட்விச்', code: 'SW03', selling_price: '75', food_type: 'veg' },
          { name: 'Club Supreme Sandwich', local_name: 'கிளப் சாண்ட்விச்', code: 'SW04', selling_price: '85', food_type: 'veg' }
        ]
      });
    } else if (preset === 'burgers') {
      setWizardData({
        categoryName: 'Burgers & Fries',
        localName: 'பர்கர்',
        icon: 'Cookie',
        color: '#B45309',
        items: [
          { name: 'Crispy Veg Tikki Burger', local_name: 'வெஜ் பர்கர்', code: 'BG01', selling_price: '55', food_type: 'veg' },
          { name: 'Paneer Supreme Burger', local_name: 'பன்னீர் பர்கர்', code: 'BG02', selling_price: '85', food_type: 'veg' },
          { name: 'Crispy Chicken Burger', local_name: 'சிக்கன் பர்கர்', code: 'BG03', selling_price: '95', food_type: 'non-veg' },
          { name: 'Salted French Fries Bowl', local_name: 'பிரெஞ்சு பிரைஸ்', code: 'BG04', selling_price: '60', food_type: 'veg' }
        ]
      });
    }
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardData.categoryName.trim()) {
      alert('Please provide a heading/category name.');
      return;
    }

    try {
      setIsLoading(true);
      // 1. Create Category
      const catRes = await api.createCategory({
        name: wizardData.categoryName.trim(),
        local_name: wizardData.localName.trim() || null,
        icon: wizardData.icon || 'UtensilsCrossed',
        color: wizardData.color || '#EA580C',
        display_order: categories.length + 1
      });

      const newCatId = catRes.id;

      // 2. Create products under category
      const validItems = wizardData.items.filter(item => item.name.trim() && item.selling_price);
      for (const item of validItems) {
        await api.createProduct({
          category_id: newCatId,
          name: item.name.trim(),
          local_name: item.local_name.trim() || null,
          code: item.code.trim() || null,
          selling_price: parseFloat(item.selling_price) || 0,
          cost_price: Math.round((parseFloat(item.selling_price) || 0) * 0.4),
          food_type: item.food_type,
          preparation_time_mins: 5,
          is_available: true
        });
      }

      setBannerMessage({
        text: `Heading "${wizardData.categoryName}" with ${validItems.length} types created successfully!`,
        type: 'success'
      });

      setIsQuickWizardOpen(false);
      // Reset wizard
      setWizardData({
        categoryName: '',
        localName: '',
        icon: 'UtensilsCrossed',
        color: '#EA580C',
        items: [
          { name: '', local_name: '', code: '', selling_price: '', food_type: 'veg' },
          { name: '', local_name: '', code: '', selling_price: '', food_type: 'veg' },
          { name: '', local_name: '', code: '', selling_price: '', food_type: 'veg' },
          { name: '', local_name: '', code: '', selling_price: '', food_type: 'veg' }
        ]
      });

      await loadData();
    } catch (err: any) {
      setBannerMessage({ text: 'Quick creation failed: ' + err.message, type: 'error' });
    } finally {
      setIsLoading(false);
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCatId === null || p.category_id === selectedCatId;
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.local_name && p.local_name.toLowerCase().includes(term)) ||
        (p.code && p.code.toLowerCase().includes(term));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCatId, search]);

  const displayedCategories = useMemo(() => {
    if (selectedCatId !== null) {
      return categories.filter(c => c.id === selectedCatId);
    }
    return categories;
  }, [categories, selectedCatId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-cream-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <span>Menu & Heading Management</span>
            <span className="text-xs bg-suvai-green-100 text-suvai-green-900 font-bold px-2 py-0.5 rounded-full">
              {products.length} Items
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Create categories (headings like Momos, Rolls) and add food items under each heading with one tap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Heading & 4 Types Preset Wizard Button */}
          <button
            onClick={() => {
              applyPreset('momos');
              setIsQuickWizardOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-suvai-orange-500 to-amber-500 hover:from-suvai-orange-600 hover:to-amber-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
            title="Create headings like Momos (4 types) or Rolls (4 types) in seconds"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>⚡ Quick Heading + 4 Types</span>
          </button>

          <button
            onClick={() => {
              setEditingCategory(null);
              setCatFormData({
                name: '',
                local_name: '',
                icon: 'UtensilsCrossed',
                color: '#EA580C',
                display_order: categories.length + 1
              });
              setIsCategoryModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-cream-100 hover:bg-cream-200 text-stone-800 text-xs font-bold rounded-xl border border-cream-200 flex items-center space-x-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-suvai-green-800" />
            <span>Add Heading</span>
          </button>

          <button
            onClick={() => openNewProductModal()}
            className="px-4 py-2.5 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
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

      {/* View Switcher, Category Pills & Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCatId === null
                ? 'bg-suvai-green-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-cream-200 hover:bg-cream-100'
            }`}
          >
            All Headings ({products.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCatId === c.id
                  ? 'bg-suvai-green-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-cream-200 hover:bg-cream-100'
              }`}
            >
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle + Search */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-white p-1 rounded-xl border border-cream-200 flex items-center shadow-xs">
            <button
              onClick={() => setViewMode('headings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'headings'
                  ? 'bg-suvai-green-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>By Headings</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-suvai-green-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dishes or codes..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-cream-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-suvai-green-700"
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: GROUPED BY HEADINGS (Categories with items inside) */}
      {viewMode === 'headings' ? (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <RefreshCw className="w-8 h-8 text-suvai-green-800 animate-spin" />
              <p className="text-xs font-semibold text-stone-500">Loading menu headings & items...</p>
            </div>
          ) : displayedCategories.length > 0 ? (
            displayedCategories.map(cat => {
              const catProducts = filteredProducts.filter(p => p.category_id === cat.id);

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden"
                >
                  {/* Category Heading Header Bar */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-cream-100/90 to-white border-b border-cream-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: cat.color || '#EA580C' }}
                      >
                        {getCategoryIcon(cat.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                            {cat.name}
                          </h3>
                          <span className="text-[11px] font-extrabold bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded-full">
                            {catProducts.length} types
                          </span>
                        </div>
                        {cat.local_name && (
                          <p className="text-xs font-medium text-stone-500">
                            {cat.local_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Category Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openNewProductModal(cat.id)}
                        className="px-3 py-1.5 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item to {cat.name}</span>
                      </button>

                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        className="p-2 text-stone-600 hover:text-stone-900 hover:bg-cream-200 rounded-xl transition-colors"
                        title="Edit Heading"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete Heading"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Items Grid Under this Heading */}
                  <div className="p-4 sm:p-5">
                    {catProducts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                        {catProducts.map(prod => (
                          <div
                            key={prod.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              prod.is_available
                                ? 'bg-cream-50/40 border-cream-200 hover:border-suvai-green-600 hover:shadow-sm'
                                : 'bg-stone-50 border-stone-200 opacity-70'
                            }`}
                          >
                            <div>
                              {/* Food Type + Code */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-1.5">
                                  <span
                                    className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center ${
                                      prod.food_type === 'veg'
                                        ? 'border-emerald-600'
                                        : prod.food_type === 'non-veg'
                                        ? 'border-rose-700'
                                        : 'border-sky-600'
                                    }`}
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
                                  {prod.code && (
                                    <span className="text-[10px] font-mono text-stone-400 uppercase">
                                      {prod.code}
                                    </span>
                                  )}
                                </div>

                                {/* Stock Switch */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleStock(prod)}
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                                    prod.is_available
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                  title="Click to toggle counter stock"
                                >
                                  {prod.is_available ? 'In Stock' : 'Sold Out'}
                                </button>
                              </div>

                              {/* Dish Title */}
                              <h4 className="font-extrabold text-sm text-stone-900 leading-snug">
                                {prod.name}
                              </h4>
                              {prod.local_name && (
                                <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                  {prod.local_name}
                                </p>
                              )}
                            </div>

                            {/* Price & Actions Footer */}
                            <div className="pt-3 mt-3 border-t border-cream-200/80 flex items-center justify-between">
                              <span className="font-black text-base text-suvai-green-950">
                                {currency}{Number(prod.selling_price).toFixed(2)}
                              </span>

                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => openEditProductModal(prod)}
                                  className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-cream-200 rounded-lg transition-colors"
                                  title="Edit Dish"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.id)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Dish"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-cream-50/50 rounded-2xl border border-dashed border-cream-300">
                        <UtensilsCrossed className="w-7 h-7 text-stone-300 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-stone-600">No items under {cat.name} yet</p>
                        <button
                          onClick={() => openNewProductModal(cat.id)}
                          className="mt-2 text-xs font-bold text-suvai-green-900 hover:underline"
                        >
                          + Add first item to {cat.name}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-cream-200">
              <p className="text-sm font-bold text-stone-700">No categories found.</p>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="mt-3 px-4 py-2 bg-suvai-green-900 text-white rounded-xl text-xs font-bold"
              >
                Create your first category heading
              </button>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: FLAT TABLE VIEW */
        <div className="bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-cream-50 border-b border-cream-200 text-stone-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Type</th>
                  <th className="py-3.5 px-4 font-bold">Item Name & Tamil Label</th>
                  <th className="py-3.5 px-4 font-bold">Heading / Category</th>
                  <th className="py-3.5 px-4 font-bold text-right">Selling Rate</th>
                  <th className="py-3.5 px-4 font-bold text-right">Cost (COGS)</th>
                  <th className="py-3.5 px-4 font-bold text-center">Counter Stock</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(prod => (
                    <tr key={prod.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded-xs ${
                            prod.food_type === 'veg'
                              ? 'border-emerald-600'
                              : prod.food_type === 'non-veg'
                              ? 'border-rose-700'
                              : 'border-sky-600'
                          }`}
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
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-stone-900">{prod.name}</div>
                        {prod.local_name && <div className="text-[11px] text-stone-500">{prod.local_name}</div>}
                        {prod.code && <span className="text-[10px] font-mono text-stone-400">Code: {prod.code}</span>}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-700">
                        {categories.find(c => c.id === prod.category_id)?.name || 'General'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sm text-suvai-green-950">
                        {currency}{Number(prod.selling_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-600 font-medium">
                        {currency}{Number(prod.cost_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStock(prod)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-colors ${
                            prod.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {prod.is_available ? 'In Stock' : 'Sold Out'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditProductModal(prod)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-cream-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400 italic">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK WIZARD MODAL: "Create Heading with 4 Types" */}
      {isQuickWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl border border-cream-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-suvai-orange-100 text-suvai-orange-600">
                  <Zap className="w-5 h-5 fill-suvai-orange-600" />
                </span>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-stone-900">
                    Quick Heading & 4 Types Creator
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Create a heading (e.g., Momos, Rolls) and add its 4 varieties in one simple step.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickWizardOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instant Presets Bar */}
            <div className="pt-3 pb-2">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Quick Template Presets (Click to autofill):
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('momos')}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 transition-all flex items-center gap-1"
                >
                  🥟 Momos (4 Types)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('rolls')}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all flex items-center gap-1"
                >
                  🌯 Rolls (4 Types)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('sandwiches')}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1"
                >
                  🥪 Sandwiches (4 Types)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('burgers')}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 transition-all flex items-center gap-1"
                >
                  🍔 Burgers (4 Types)
                </button>
              </div>
            </div>

            <form onSubmit={handleWizardSubmit} className="space-y-4 pt-2 text-xs">
              {/* Heading Fields */}
              <div className="p-3.5 bg-cream-50 rounded-2xl border border-cream-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">
                      Heading / Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={wizardData.categoryName}
                      onChange={e => setWizardData({ ...wizardData, categoryName: e.target.value })}
                      placeholder="e.g., Momos Special, Rolls & Wraps"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">
                      Tamil / Regional Label
                    </label>
                    <input
                      type="text"
                      value={wizardData.localName}
                      onChange={e => setWizardData({ ...wizardData, localName: e.target.value })}
                      placeholder="e.g., மோமோஸ், ரோல்ஸ்"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium text-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* 4 Varieties Items Section */}
              <div className="space-y-2">
                <label className="block font-bold text-stone-700 uppercase">
                  4 Varieties Under This Heading:
                </label>
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {wizardData.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-2xl border border-cream-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-lg bg-suvai-green-100 text-suvai-green-900 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={e => {
                            const updated = [...wizardData.items];
                            updated[idx].name = e.target.value;
                            setWizardData({ ...wizardData, items: updated });
                          }}
                          placeholder={`Variety ${idx + 1} Name (e.g. Steamed Veg Momos)`}
                          className="w-full px-2.5 py-1.5 bg-cream-50/50 border border-stone-200 rounded-lg text-xs font-semibold"
                        />
                      </div>

                      <div className="w-full sm:w-28 flex items-center space-x-1">
                        <span className="text-stone-400 font-bold">{currency}</span>
                        <input
                          type="number"
                          required
                          value={item.selling_price}
                          onChange={e => {
                            const updated = [...wizardData.items];
                            updated[idx].selling_price = e.target.value;
                            setWizardData({ ...wizardData, items: updated });
                          }}
                          placeholder="Price"
                          className="w-full px-2 py-1.5 bg-cream-50/50 border border-stone-200 rounded-lg text-xs font-black text-suvai-green-950"
                        />
                      </div>

                      <div className="w-full sm:w-28">
                        <select
                          value={item.food_type}
                          onChange={e => {
                            const updated = [...wizardData.items];
                            updated[idx].food_type = e.target.value as FoodType;
                            setWizardData({ ...wizardData, items: updated });
                          }}
                          className="w-full px-2 py-1.5 bg-cream-50/50 border border-stone-200 rounded-lg text-xs font-semibold"
                        >
                          <option value="veg">Veg</option>
                          <option value="non-veg">Non-Veg</option>
                          <option value="beverage">Beverage</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setIsQuickWizardOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 bg-cream-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl text-white bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 font-bold shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Heading & All 4 Varieties</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standard Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
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
                  placeholder="e.g., Peri Peri Tossed Momos"
                  className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-suvai-green-700"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Tamil / Regional Name</label>
                <input
                  type="text"
                  value={formData.local_name}
                  onChange={e => setFormData({ ...formData, local_name: e.target.value })}
                  placeholder="e.g., பெரி பெரி மோமோஸ்"
                  className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-suvai-green-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Category / Heading *</label>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:outline-hidden focus:border-suvai-green-700"
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
                    placeholder="70.00"
                    className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-bold text-suvai-green-950 focus:outline-hidden focus:border-suvai-green-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Cost Price ({currency})</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.cost_price}
                    onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="30.00"
                    className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-bold text-stone-700 focus:outline-hidden focus:border-suvai-green-700"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="modal-stock"
                  checked={formData.is_available}
                  onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4 rounded text-suvai-green-800"
                />
                <label htmlFor="modal-stock" className="text-xs font-bold text-stone-700">
                  Available in counter stock right now
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 bg-cream-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl text-white bg-suvai-green-900 font-bold shadow-md"
                >
                  {editingProduct ? 'Update Dish' : 'Save Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standard Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-cream-200">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h3 className="font-extrabold text-base text-stone-900">
                {editingCategory ? 'Edit Category Heading' : 'Create Category Heading'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Heading / Category Name *</label>
                <input
                  type="text"
                  required
                  value={catFormData.name}
                  onChange={e => setCatFormData({ ...catFormData, name: e.target.value })}
                  placeholder="e.g., Momos Special, Rolls & Wraps"
                  className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Tamil / Regional Name</label>
                <input
                  type="text"
                  value={catFormData.local_name}
                  onChange={e => setCatFormData({ ...catFormData, local_name: e.target.value })}
                  placeholder="e.g., மோமோஸ், ரோல்ஸ்"
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
                  className="px-5 py-2 rounded-xl text-white bg-suvai-green-900 font-bold shadow-md"
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
