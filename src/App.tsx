import React, { useState, useEffect, useRef } from "react";
import { 
  ShoppingCart, 
  Search, 
  ShieldCheck, 
  Truck, 
  Headphones, 
  MapPin, 
  LogOut, 
  Globe, 
  Cpu, 
  Layers,
  ChevronDown,
  Info,
  Minus,
  Plus,
  Settings,
  X,
  CreditCard,
  User,
  ArrowRight,
  Sparkles,
  Lock,
  Phone,
  Hash,
  Database,
  Check,
  MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  auth, 
  signInWithGoogle, 
  logOut, 
  saveUserCartToFirestore, 
  loadUserCartFromFirestore 
} from "./firebase";
import scriptData from "../script.json";

// Shared Interfaces
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  isBestSeller?: boolean;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email?: string;
  photoURL?: string;
  phone: string;
  labId: string;
}

export default function App() {
  // Configuration read from central script.json
  const company = scriptData.company;
  const productsList: Product[] = scriptData.products;
  const systemStatus = scriptData.system;

  // Persistence States
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("sc_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("sc_cart_items");
    return saved ? JSON.parse(saved) : [];
  });

  // UI States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // Checkout Form States
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  // Prefill checkout details when user and checkout modal are ready
  useEffect(() => {
    if (user && isCheckoutOpen) {
      if (!checkoutName) {
        setCheckoutName(user.fullName || "");
      }
      if (!checkoutPhone && user.phone && user.phone !== "N/A") {
        setCheckoutPhone(user.phone);
      }
    }
  }, [user, isCheckoutOpen, checkoutName, checkoutPhone]);

  // Auth & loading UI states
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          fullName: firebaseUser.displayName || firebaseUser.email || "Operator",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || undefined,
          phone: firebaseUser.phoneNumber || "N/A",
          labId: "LAB-" + firebaseUser.uid.slice(0, 5).toUpperCase(),
        };
        setUser(profile);
        localStorage.setItem("sc_user", JSON.stringify(profile));

        // Load the cart from Firestore
        setIsCartLoading(true);
        const remoteCart = await loadUserCartFromFirestore(firebaseUser.uid);
        if (remoteCart) {
          setCartItems(remoteCart);
        }
        setIsCartLoading(false);
      } else {
        setUser(null);
        setCartItems([]);
        localStorage.removeItem("sc_user");
        localStorage.removeItem("sc_cart_items");
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Cart Items to LocalStorage and Firestore on change
  useEffect(() => {
    if (cartItems.length > 0 || localStorage.getItem("sc_cart_items")) {
      localStorage.setItem("sc_cart_items", JSON.stringify(cartItems));
    }
    
    if (user && !isCartLoading) {
      saveUserCartToFirestore(user.uid, cartItems);
    }
  }, [cartItems, user, isCartLoading]);

  // Handle Google Login submission
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error(error);
      setLoginError("Google Sign-In failed. If you are using an in-app workspace browser, click the 'Open in New Tab' button on top of the preview to ensure popup permission is authorized.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Log out handler
  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error("logout error", error);
      // Fallback clean local state
      setUser(null);
      setCartItems([]);
      localStorage.removeItem("sc_cart_items");
      localStorage.removeItem("sc_user");
    }
  };

  // Add Item with specific quantity
  const addToCart = (product: Product, quantityToAdd: number) => {
    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item.product.id === product.id);
      if (existing) {
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        );
      }
      return [...prevItems, { product, quantity: quantityToAdd }];
    });
    
    // Reset specific selector quantities back to 1
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
  };

  // Directly change quantity of cart items in the Drawer
  const updateCartQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity: newQty } : item
        )
      );
    }
  };

  // Increment local item selector quantity
  const incrementSelector = (productId: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 1) + 1,
    }));
  };

  // Decrement local item selector quantity
  const decrementSelector = (productId: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) - 1),
    }));
  };

  // Dynamic products filtering
  const filteredProducts = productsList.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["All", "Controllers", "Actuators & Drivers", "Robot Kits", "Sensors"];

  const cartTotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Send purchase dispatch message directly to WhatsApp Coordinator
  const handleDispatchRedirect = () => {
    if (!user) return;

    if (!checkoutName.trim()) {
      setCheckoutError("Please enter your name for delivery coordinates.");
      return;
    }
    if (!checkoutPhone.trim()) {
      setCheckoutError("Please enter a WhatsApp contact phone number.");
      return;
    }
    if (!checkoutAddress.trim()) {
      setCheckoutError("Please specify a shipping or delivery address.");
      return;
    }

    setCheckoutError("");
    
    // Format message exactly as specified:
    // Name: <Name>
    // Phone: <Phone>
    // Address: <Address>
    //
    // Products:
    // • <product_name> x<qty>
    //
    // Total: ₹<price>
    let message = `Name: ${checkoutName.trim()}\n`;
    message += `Phone: ${checkoutPhone.trim()}\n`;
    message += `Address: ${checkoutAddress.trim()}\n\n`;
    message += `Products:\n`;
    
    cartItems.forEach((item) => {
      message += `• ${item.product.name} x${item.quantity}\n`;
    });
    
    message += `\nTotal: ₹${cartTotal}`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${company.whatsappNumber.replace("+", "")}?text=${encodedText}`;
    
    // Open WhatsApp link
    window.open(whatsappUrl, "_blank");
    setIsCheckoutOpen(false);
  };

  const handleGenericChatRedirect = () => {
    const operatorInfo = user ? ` Operator ID: ${user.labId} (${user.fullName}).` : '';
    const message = `Hello Steel Circuit Lab Cooperator, I am writing to inquire about lab modules and controller assemblies.${operatorInfo}`;
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${company.whatsappNumber.replace("+", "")}?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen pb-12 select-none">
      
      {/* 1. LOGIN GATE PROTECTION */}
      {!user && (
        <div className="fixed inset-0 bg-[#050505]/95 z-50 flex items-center justify-center p-4 text-zinc-100">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#0f0f12] border border-[#1f1f23] rounded-[24px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-brand-cyan/15 rounded-2xl flex items-center justify-center text-brand-cyan mb-4 box-glow-cyan border border-brand-cyan/25">
                <Cpu className="w-7 h-7" />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-white mb-2 uppercase">
                {company.name}
              </h2>
              <p className="text-zinc-400 font-mono text-xs max-w-xs leading-relaxed">
                {company.description} Access secure cloud-synchronized pipelines using single-factor Google authentication.
              </p>
            </div>

            <div className="space-y-4">
              {loginError && (
                <div className="bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs font-mono flex flex-col gap-1.5 leading-normal">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                    <strong>Authentication Error</strong>
                  </div>
                  <div>{loginError}</div>
                </div>
              )}

              <button 
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full bg-[#18181b] hover:bg-white hover:text-black border border-[#1f1f23] text-white font-mono text-xs py-3.5 px-4 uppercase tracking-wider cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.03)] hover:shadow-[0_4px_25px_rgba(255,255,255,0.12)] flex items-center justify-center gap-2.5 rounded-xl transition-all font-semibold"
              >
                {isLoggingIn ? (
                  <span className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin mr-1" />
                ) : (
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Authenticate via Google
              </button>

              <div className="text-center">
                <span className="text-[10px] text-zinc-600 font-mono tracking-wide">
                  SECURE END-TO-END PIPELINE LINK
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. HEADER BAR */}
      {user && (
        <>
          <header className="sticky top-0 bg-[#050505]/85 backdrop-blur-md border-b border-[#1f1f23] z-40 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              
              {/* Logo branding */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-cyan/15 rounded-xl border border-brand-cyan/25 flex items-center justify-center text-brand-cyan box-glow-cyan shadow-inner">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-display text-base font-black tracking-wider uppercase text-white leading-none">
                    {company.name}
                  </h1>
                  <span className="font-mono text-[9px] text-[#22d3ee] tracking-widest uppercase text-glow">
                    LOGISTICS & MODULE DISPATCH
                  </span>
                </div>
              </div>

              {/* Profile details & Logout block */}
              <div className="flex items-center gap-4">
                {user.photoURL && (
                  <img 
                    src={user.photoURL} 
                    alt={user.fullName} 
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full border border-zinc-700/80 shadow-[0_0_10px_rgba(34,211,238,0.15)] shrink-0"
                  />
                )}
                
                <div className="hidden md:flex flex-col text-right font-mono text-xs">
                  <span className="text-white font-medium">{user.fullName}</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Operator ID: <span className="text-zinc-400">{user.labId}</span></span>
                </div>
                
                <button 
                  onClick={handleLogout}
                  title="Disconnect operator session"
                  className="flex items-center gap-2 font-mono text-[10px] uppercase border border-zinc-900 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>

            </div>
          </header>

          {/* 3. HERO & METRICS CONTAINER */}
          <main className="pt-8">
            
            {/* Dynamic Banner Notification */}
            <div className="max-w-7xl mx-auto px-6 mb-8">
              <div className="bg-[#0f0f12] border border-[#1f1f23] rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white mb-1.5 flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-brand-cyan shrink-0 animate-pulse" />
                    Interactive Component Assembly Pipeline
                  </h2>
                  <p className="text-zinc-400 text-xs max-w-2xl leading-relaxed">
                    Build smart, interactive DIY robots and electronic projects. Select physical components below, initialize their assembly values, and request direct coordinator dispatch via instant secure WhatsApp coordination.
                  </p>
                </div>
                <div className="bg-[#1c1917]/30 border border-[#27272a]/70 rounded-xl px-4 py-2 text-center shrink-0 flex items-center gap-2">
                  <Database className="w-4 h-4 text-brand-green text-glow-green" />
                  <div className="font-mono text-left">
                    <div className="text-[9px] text-zinc-500 uppercase">DURABLE SESSION</div>
                    <div className="text-[11px] text-zinc-300 font-bold uppercase">PERSISTENT CACHE</div>
                  </div>
                </div>
              </div>
            </div>

            {/* BENTO GRID OPERATIONAL DASHBOARD */}
            <section className="max-w-7xl mx-auto px-6 mb-12">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Bento Card 1: System Status & Core Mission */}
                <div className="glass-panel p-6 md:col-span-6 flex flex-col justify-between rounded-3xl h-full min-h-[160px]">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest text-glow-green">Operation Link</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-1">
                      System Status: <span className="text-green-400">{systemStatus.status}</span>
                    </h3>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      {systemStatus.description} Direct coordinate pipeline triggers physical assembly queue.
                    </p>
                  </div>
                  <div className="mt-4 text-[10px] font-mono text-brand-cyan uppercase tracking-wider">
                    LINK ESTABLISHED SECURELY
                  </div>
                </div>

                {/* Bento Card 2: Instant Checkout Sync */}
                <div className="glass-panel p-6 md:col-span-6 flex items-center gap-4 rounded-3xl h-full min-h-[160px]">
                  <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-brand-cyan shrink-0 box-glow-cyan">
                    <svg className="w-5 h-5 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" style={{ color: "var(--color-brand-cyan)" }} />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-white text-base">Instant Checkout Sync</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      One-click laboratory coordinate dispatcher approved. Fast-forward to physical transit pipeline.
                    </p>
                    <span className="inline-block mt-2.5 bg-brand-cyan/10 border border-brand-cyan/25 text-brand-cyan font-mono text-[9px] py-1 px-2.5 rounded-full uppercase tracking-wider">
                      PAYMENT DISPATCH APPROVED
                    </span>
                  </div>
                </div>

              </div>

              {/* Sub banner dispatch alert */}
              <div className="mt-5 text-center">
                <span className="inline-flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/80 text-zinc-400 font-mono text-[10px] py-2.5 px-6 rounded-full tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                  {company.bentoAlert}
                </span>
              </div>
            </section>

            {/* 4. MAIN BROWSER CONTROLS: CATEGORIES & FILTERING */}
            <section className="max-w-7xl mx-auto px-6 mb-8">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#0f0f12] p-4 rounded-2xl border border-[#1f1f23]">
                
                {/* Search Bar */}
                <div className="relative flex-grow max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search node controller components..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#1f1f23] hover:border-zinc-800 focus:border-brand-cyan rounded-xl py-2.5 pl-11 pr-4 text-xs font-mono text-white focus:outline-none transition-colors placeholder-zinc-600"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Categories filtering container */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none custom-scroll">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`whitespace-nowrap font-mono text-[10px] uppercase py-2 px-4 rounded-xl cursor-pointer border transition-all ${
                        selectedCategory === category 
                          ? "bg-brand-cyan border-brand-cyan text-black font-bold shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                          : "bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

              </div>
            </section>

            {/* 5. PRODUCT DISPLAY GRID */}
            <section className="max-w-7xl mx-auto px-6 mb-12">
              {filteredProducts.length === 0 ? (
                <div className="glass-panel p-12 text-center text-zinc-500 font-mono text-xs">
                  No modules match your query parameters. Try widening your search query.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => {
                    const selectorQty = quantities[product.id] || 1;
                    return (
                      <div 
                        key={product.id}
                        id={`product-${product.id}`}
                        className="glass-panel p-6 flex flex-col product-card group relative rounded-3xl transition-all duration-500"
                      >
                        {product.isBestSeller && (
                          <div className="absolute top-4 left-4 bg-[#22d3ee] text-black font-mono text-[10px] tracking-wider py-1 px-2.5 uppercase font-bold z-10 rounded-lg shadow-sm">
                            BEST SELLER
                          </div>
                        )}
                        
                        {/* Real Component Photograph Block */}
                        <div className="w-full h-48 bg-[#0a0a0c] border border-[#1f1f23] rounded-2xl overflow-hidden mb-5 relative group-hover:border-zinc-800 transition-colors">
                          <img 
                            src={product.image} 
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        {/* Title, tags and Description */}
                        <div className="flex flex-col flex-grow">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] text-[#22d3ee] uppercase tracking-wider bg-brand-cyan/5 px-2 py-0.5 rounded">
                              {product.category}
                            </span>
                          </div>
                          
                          <h3 className="font-display text-lg font-bold text-white mb-2 leading-tight group-hover:text-brand-cyan transition-colors">
                            {product.name}
                          </h3>
                          <p className="font-mono text-xs text-[#849495] mb-6 flex-grow font-medium leading-relaxed">
                            {product.description}
                          </p>

                          {/* Controls (Buy / Counter block) */}
                          <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#1f1f23]">
                            <span className="text-xl font-bold font-mono text-white">
                              ₹{product.price}
                            </span>
                            
                            <div className="flex items-center bg-[#131111] border border-white/10 rounded-lg h-9">
                              <button 
                                onClick={() => decrementSelector(product.id)}
                                type="button" 
                                className="text-[#849495] hover:text-[#22d3ee] px-2.5 h-full transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-mono font-bold text-white w-8 text-center bg-[#131111]">
                                {selectorQty}
                              </span>
                              <button 
                                onClick={() => incrementSelector(product.id)}
                                type="button" 
                                className="text-[#849495] hover:text-[#22d3ee] px-2.5 h-full transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Trigger action button mapping */}
                          <button 
                            onClick={() => addToCart(product, selectorQty)}
                            type="button"
                            className="w-full mt-4 bg-[#18181b] hover:bg-brand-cyan hover:text-black border border-[#1f1f23] text-zinc-300 font-mono text-xs py-2.5 px-4 uppercase tracking-wider font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Add Module
                          </button>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            
            {/* 5.5. COOPERATOR ACCESS FOOTER */}
            <footer className="max-w-7xl mx-auto px-6 mt-16 pt-12 pb-16 border-t border-[#1f1f23] text-zinc-400">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
                
                {/* Brand Column */}
                <div className="md:col-span-5 space-y-4">
                  <div className="flex items-center gap-2 text-white">
                    <Cpu className="w-6 h-6 text-brand-cyan" />
                    <span className="font-display text-base font-bold uppercase tracking-wider">{company.name}</span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono leading-relaxed max-w-sm">
                    {company.description} All dispatch operations sync directly into our high-speed physical coordination and transit queue.
                  </p>
                  <p className="text-xs text-zinc-400 font-mono">
                    Want to know more about the owner? Visit{" "}
                    <a 
                      href="https://www.steelcircuits.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-brand-cyan hover:underline hover:text-white transition-colors font-semibold"
                    >
                      www.steelcircuits.com
                    </a>
                  </p>
                </div>

                {/* Logistics Coordinates */}
                <div className="md:col-span-3 space-y-4">
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900/40 p-1 rounded inline-block">LOGISTICS COORDINATES</h4>
                  <ul className="space-y-2.5 font-mono text-xs">
                    <li className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>{company.deliveryDays}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Encrypted User & Cart Sync</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Coordinated Base: India</span>
                    </li>
                  </ul>
                </div>

                {/* Direct WhatsApp Hotline */}
                <div className="md:col-span-4 space-y-4">
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900/40 p-1 rounded inline-block">COORDINATOR DIRECT DESK</h4>
                  <div className="bg-[#0a0a0c] border border-[#1f1f23] p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden group">
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" />
                      <span className="font-mono text-[8px] text-[#25d366] uppercase tracking-wider font-bold">ONLINE</span>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#25d366]/10 border border-[#25d366]/20 flex items-center justify-center text-[#25d366]">
                        <MessageCircle className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase">WhatsApp Support Hotline</div>
                        <div className="text-xs font-mono text-white font-bold">{company.whatsappNumber}</div>
                      </div>
                    </div>

                    <button 
                      onClick={handleGenericChatRedirect}
                      className="w-full bg-[#25d366]/10 hover:bg-[#25d366] border border-[#25d366]/20 hover:border-[#25d366] hover:text-black text-[#25d366] font-mono text-[10px] font-bold py-2.5 px-3 uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Inquire Directly Now
                    </button>
                  </div>
                </div>

              </div>

              {/* Bottom Copyright details */}
              <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] text-zinc-600">
                <div>
                  © {new Date().getFullYear()} {company.name}. All hardware logistics secured.
                </div>
                <div className="flex items-center gap-4">
                  <span className="hover:text-zinc-500 transition-colors">LATENCY: Sub-30ms</span>
                  <span>•</span>
                  <span className="hover:text-zinc-500 transition-colors">NODE: IN-MUM-01</span>
                </div>
              </div>
            </footer>

          </main>
          
          {/* 6. FLOATING DYNAMIC CART BUTTON TRIGGER */}
          {totalItemsCount > 0 && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed bottom-6 right-6 z-40"
            >
              <button 
                onClick={() => setIsCartOpen(true)}
                className="w-16 h-16 bg-brand-cyan text-black rounded-full shadow-[0_4px_30px_rgba(34,211,238,0.4)] hover:shadow-[0_4px_35px_rgba(34,211,238,0.65)] hover:scale-105 duration-200 cursor-pointer flex items-center justify-center relative border border-cyan-300/30"
              >
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 border-2 border-[#050505] text-white text-[10px] font-bold font-mono w-6.5 h-6.5 rounded-full flex items-center justify-center animate-pulse">
                  {totalItemsCount}
                </span>
              </button>
            </motion.div>
          )}


          {/* 7. SLIDING CART DRAWER */}
          <AnimatePresence>
            {isCartOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 bg-black/85 z-45"
                  onClick={() => setIsCartOpen(false)}
                />

                {/* Sliding panel content */}
                <motion.div 
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0f0f12] border-l border-[#1f1f23] z-46 p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col"
                >
                  
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#1f1f23] mb-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-brand-cyan" />
                      <h2 className="font-display text-lg font-bold text-white uppercase">
                        Dispatch Assembly Queue
                      </h2>
                    </div>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-zinc-500 hover:text-white p-1 rounded-xl cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Items list container */}
                  <div className="flex-grow overflow-y-auto custom-scroll pr-1">
                    {cartItems.length === 0 ? (
                      <div className="h-44 flex flex-col items-center justify-center text-center text-zinc-500 font-mono text-xs gap-2">
                        <ShoppingCart className="w-8 h-8 text-zinc-700 animate-bounce" />
                        <div>Assembly line is completely empty. Add some module components above.</div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cartItems.map((item) => (
                          <div 
                            key={item.product.id}
                            className="bg-[#0a0a0c] border border-[#1f1f23] rounded-2xl p-4 flex gap-4 hover:border-zinc-800 transition-colors"
                          >
                            <div className="w-16 h-16 bg-zinc-950 rounded-xl p-2 shrink-0 border border-zinc-900/50">
                              <img 
                                src={item.product.image} 
                                alt={item.product.name} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            
                            <div className="flex-grow flex flex-col justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-white truncate leading-tight">
                                  {item.product.name}
                                </h4>
                                <span className="font-mono text-[10px] text-[#22d3ee]">
                                  ₹{item.product.price}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-zinc-900">
                                <div className="flex items-center bg-[#131111] border border-white/5 rounded-md h-7">
                                  <button 
                                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                    className="text-zinc-500 hover:text-[#22d3ee] px-2 h-full transition-colors cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-[11px] font-mono font-bold text-white w-6 text-center">
                                    {item.quantity}
                                  </span>
                                  <button 
                                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                    className="text-zinc-500 hover:text-[#22d3ee] px-2 h-full transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                
                                <button 
                                  onClick={() => updateCartQuantity(item.product.id, 0)}
                                  className="text-[10px] uppercase font-mono text-red-500 hover:text-red-400 font-semibold cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary Footer */}
                  {cartItems.length > 0 && (
                    <div className="pt-4 border-t border-[#1f1f23] mt-4 space-y-4">
                      
                      <div className="space-y-1.5 font-mono text-xs text-zinc-400">
                        <div className="flex justify-between">
                          <span>Total Units:</span>
                          <span className="text-white font-medium">{totalItemsCount} Modules</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dispatch Base:</span>
                          <span className="text-white font-medium">Pan India</span>
                        </div>
                        <div className="flex justify-between text-white text-sm font-bold pt-1.5 border-t border-zinc-900 font-display">
                          <span>Total Est Price:</span>
                          <span className="text-brand-cyan">₹{cartTotal}/-</span>
                        </div>
                      </div>

                      {/* Dispatch Submit button */}
                      <button 
                        onClick={() => {
                          setIsCartOpen(false);
                          setIsCheckoutOpen(true);
                        }}
                        className="w-full btn-primary font-mono text-xs uppercase py-3.5 tracking-wider cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.25)] flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Approve Dispatch Pipeline
                      </button>

                    </div>
                  )}

                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* 8. CHECKOUT COORDINATORS COORDINATION POPUP */}
          <AnimatePresence>
            {isCheckoutOpen && (
              <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-lg bg-[#0f0f12] border border-[#1f1f23] rounded-[24px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#1f1f23] mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-brand-green" />
                      <h2 className="font-display text-base font-bold text-white uppercase tracking-wider">
                        DISPATCH SYNC VERIFIED
                      </h2>
                    </div>
                    <button 
                      onClick={() => setIsCheckoutOpen(false)}
                      className="text-zinc-500 hover:text-white p-1 rounded-xl cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body text info */}
                  <div className="space-y-4">
                    
                    <div className="bg-[#18181b] border border-zinc-900 rounded-xl p-4 flex gap-3.5">
                      <div className="w-9 h-9 bg-brand-green/15 border border-brand-green/20 rounded-lg flex items-center justify-center text-brand-green shrink-0">
                        <Check className="w-5 h-5 text-[#25d366]" style={{ color: "var(--color-brand-green)" }} />
                      </div>
                      <div>
                        <h4 className="text-zinc-300 font-mono text-xs font-bold uppercase tracking-wider">
                          Transit Coordinator Synced 
                        </h4>
                        <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed font-mono">
                          Direct WhatsApp hotline linking is authorized under operator lab code <span className="text-zinc-300">{user.labId}</span>. No additional registration is needed.
                        </p>
                      </div>
                    </div>

                    {/* Order summary visualization */}
                    <div className="border border-[#1f1f23] rounded-xl p-4 font-mono text-xs bg-zinc-950">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-2 mb-2.5">
                        Assembly Order Summary
                      </div>
                      <div className="max-h-36 overflow-y-auto custom-scroll space-y-1.5 pr-2">
                        {cartItems.map((item) => (
                          <div key={item.product.id} className="flex justify-between text-[11px]">
                            <span className="text-zinc-400 truncate max-w-[250px]">{item.product.name} (x{item.quantity})</span>
                            <span className="text-zinc-300">₹{item.product.price * item.quantity}/-</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-zinc-900 pt-2.5 mt-2.5 flex justify-between font-bold text-zinc-300">
                        <span>EST. TOTAL</span>
                        <span className="text-[#22d3ee]">₹{cartTotal}/-</span>
                      </div>
                    </div>

                    {/* Target Delivery coordinates form */}
                    <div className="space-y-3.5 border-t border-[#1f1f23] pt-4">
                      <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest bg-zinc-900/40 p-1.5 rounded inline-block">
                        Delivery Coordinates
                      </div>

                      {checkoutError && (
                        <div className="bg-red-950/40 border border-red-500/30 text-red-500 rounded-xl p-3 text-xs font-mono flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0 animate-ping" />
                          <span>{checkoutError}</span>
                        </div>
                      )}

                      {/* Name field */}
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
                          Delivery Contact Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input 
                            type="text" 
                            placeholder="Recipient's Name"
                            value={checkoutName}
                            onChange={(e) => setCheckoutName(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#1f1f23] hover:border-zinc-800 focus:border-brand-cyan rounded-xl py-2.5 pl-11 pr-4 text-xs text-white focus:outline-none transition-colors font-sans placeholder-zinc-650"
                          />
                        </div>
                      </div>

                      {/* Phone field */}
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
                          WhatsApp Contact Phone
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input 
                            type="tel" 
                            placeholder="10-Digit WhatsApp Number"
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#1f1f23] hover:border-zinc-800 focus:border-brand-cyan rounded-xl py-2.5 pl-11 pr-4 text-xs text-white focus:outline-none transition-colors font-mono placeholder-zinc-650"
                          />
                        </div>
                      </div>

                      {/* Address field */}
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
                          Shipping Address (Coordinates)
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                          <textarea 
                            rows={2}
                            placeholder="Complete physical mailing address with city & postal code"
                            value={checkoutAddress}
                            onChange={(e) => setCheckoutAddress(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#1f1f23] hover:border-zinc-800 focus:border-brand-cyan rounded-xl py-2.5 pl-11 pr-4 text-xs text-white focus:outline-none transition-colors font-sans placeholder-zinc-650 resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Active Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-[#1f1f23]">
                      <button 
                        onClick={() => setIsCheckoutOpen(false)}
                        className="flex-1 border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-zinc-400 hover:text-white font-mono text-xs py-3 rounded-xl cursor-pointer transition-colors"
                      >
                        CLOSE
                      </button>
                      
                      <button 
                        onClick={handleDispatchRedirect}
                        className="flex-1 bg-[#25d366] hover:bg-[#128c7e] text-black hover:text-white font-mono text-xs font-extrabold py-3 uppercase tracking-wider cursor-pointer shadow-[0_4px_20px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2 rounded-xl transition-all duration-300"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Place Order via WhatsApp
                      </button>
                    </div>

                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </>
      )}

    </div>
  );
}
