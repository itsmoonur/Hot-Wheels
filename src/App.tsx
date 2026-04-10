/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  Package, 
  RefreshCw, 
  Download, 
  Image as ImageIcon,
  AlertCircle,
  Moon,
  Sun,
  X,
  Save,
  Bookmark,
  Trash2,
  Library,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { generateToyPackaging, analyzeCarImage, CarAttributes } from '@/src/services/geminiService';

interface Preset {
  id: string;
  name: string;
  attributes: CarAttributes;
}

interface CollectionItem {
  id: string;
  image: string;
  attributes: CarAttributes;
  date: string;
}

export default function App() {
  const [view, setView] = useState<'generator' | 'collection'>('generator');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [attributes, setAttributes] = useState<CarAttributes>({
    make: '',
    model: '',
    color: '',
    style: 'Classic',
    packagingStyle: 'Mainline'
  });
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('hotwheels-presets');
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }

      const savedCollection = localStorage.getItem('hotwheels-collection');
      if (savedCollection) {
        setCollection(JSON.parse(savedCollection));
      }
    } catch (e) {
      console.error("Failed to load data from storage:", e);
      setError("Could not load your saved data. It might be corrupted or storage access is restricted.");
    }
    
    // Check system preference for dark mode
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hotwheels-presets', JSON.stringify(presets));
    } catch (e) {
      handleStorageError(e, 'presets');
    }
  }, [presets]);

  useEffect(() => {
    try {
      localStorage.setItem('hotwheels-collection', JSON.stringify(collection));
    } catch (e) {
      handleStorageError(e, 'collection');
    }
  }, [collection]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const savePreset = () => {
    if (!attributes.make || !attributes.model) {
      setError("Enter make and model to save a preset.");
      return;
    }
    const name = presetName || `${attributes.make} ${attributes.model}`;
    const newPreset: Preset = {
      id: Date.now().toString(),
      name,
      attributes: { ...attributes }
    };
    setPresets([...presets, newPreset]);
    setPresetName('');
  };

  const deletePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
  };

  const applyPreset = (preset: Preset) => {
    setAttributes(preset.attributes);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setError(null);
        
        setIsAnalyzing(true);
        try {
          const detected = await analyzeCarImage(base64, file.type);
          setAttributes(prev => ({
            ...prev,
            make: detected.make || prev.make,
            model: detected.model || prev.model,
            color: detected.color || prev.color,
            style: detected.style || prev.style,
          }));
        } catch (err) {
          console.error("Analysis failed", err);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!attributes.make || !attributes.model) {
      setError("Please enter both Make and Model.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateToyPackaging(attributes, selectedImage || undefined);
      setResultImage(result);
    } catch (err) {
      console.error(err);
      setError("Failed to generate packaging. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setSelectedImage(null);
    setAttributes({ make: '', model: '', color: '', style: 'Classic', packagingStyle: 'Mainline' });
    setResultImage(null);
    setError(null);
  };

  const saveToCollection = () => {
    if (!resultImage) return;
    const newItem: CollectionItem = {
      id: Date.now().toString(),
      image: resultImage,
      attributes: { ...attributes },
      date: new Date().toLocaleDateString()
    };
    setCollection([newItem, ...collection]);
  };

  const removeFromCollection = (id: string) => {
    setCollection(collection.filter(item => item.id !== id));
  };

  const clearCollection = () => {
    setCollection([]);
    localStorage.removeItem('hotwheels-collection');
    setShowClearConfirm(false);
  };

  const handleStorageError = (error: unknown, context: 'presets' | 'collection') => {
    console.error(`Storage error (${context}):`, error);
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        if (context === 'collection') {
          setError("Your collection is too large for browser storage. Please download your favorite images and remove some items from the collection to save more.");
        } else {
          setError("Storage limit reached: Could not save your presets. Please remove some saved presets to make room.");
        }
      } else if (error.name === 'SecurityError') {
        setError("Browser security settings are preventing data from being saved. Please check if cookies or local storage are disabled.");
      } else {
        setError(`An unexpected storage error occurred: ${error.message}. Your changes might not be saved.`);
      }
    } else {
      setError("An unknown error occurred while trying to save your data.");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-500 font-sans">
      {/* Header */}
      <header className="border-b border-black dark:border-white/10 h-20 sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300">
              <Package className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="font-black text-2xl tracking-tighter uppercase italic">HotWheels</span>
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-50">AI Generator</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setView(view === 'generator' ? 'collection' : 'generator')}
              className={`rounded-none border-b-2 transition-all font-bold uppercase tracking-widest text-xs h-full px-4 ${view === 'collection' ? 'border-blue-600 text-blue-600' : 'border-transparent opacity-50 hover:opacity-100'}`}
            >
              <Library className="w-4 h-4 mr-2" /> 
              {view === 'collection' ? 'Back to Generator' : `My Collection (${collection.length})`}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reset}
              className="hidden sm:flex border-black dark:border-white/20 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-none border border-transparent hover:border-black dark:hover:border-white transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {view === 'generator' ? (
          <>
            {/* Left: Configuration (Scrollable) */}
            <section className="w-full lg:w-[450px] border-r border-black dark:border-white/10 p-8 space-y-10 overflow-y-auto lg:h-[calc(100vh-80px)] scrollbar-hide">
          
          {/* Presets Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Presets</h3>
              <span className="text-[10px] font-bold opacity-20">{presets.length}/10</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.length > 0 ? presets.map(preset => (
                <div key={preset.id} className="group relative">
                  <button 
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 border border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center gap-2"
                  >
                    <Bookmark className="w-3 h-3 text-blue-500" />
                    {preset.name}
                  </button>
                  <button 
                    onClick={() => deletePreset(preset.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )) : (
                <p className="text-xs opacity-30 italic">No presets saved yet.</p>
              )}
            </div>
          </div>

          <Separator className="bg-black/5 dark:bg-white/5" />

          {/* Form Section */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Make</Label>
                  <div className="relative">
                    <Input 
                      placeholder="e.g. Porsche" 
                      value={attributes.make}
                      onChange={(e) => setAttributes({...attributes, make: e.target.value})}
                      className="rounded-none border-black dark:border-white/20 focus-visible:ring-0 focus-visible:border-blue-500 bg-transparent h-12 font-bold"
                    />
                    {isAnalyzing && <RefreshCw className="absolute right-3 top-4 w-4 h-4 animate-spin text-blue-500" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Model</Label>
                  <div className="relative">
                    <Input 
                      placeholder="e.g. 911 GT3" 
                      value={attributes.model}
                      onChange={(e) => setAttributes({...attributes, model: e.target.value})}
                      className="rounded-none border-black dark:border-white/20 focus-visible:ring-0 focus-visible:border-blue-500 bg-transparent h-12 font-bold"
                    />
                    {isAnalyzing && <RefreshCw className="absolute right-3 top-4 w-4 h-4 animate-spin text-blue-500" />}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Color</Label>
                <div className="relative">
                  <Input 
                    placeholder="e.g. Guards Red" 
                    value={attributes.color}
                    onChange={(e) => setAttributes({...attributes, color: e.target.value})}
                    className="rounded-none border-black dark:border-white/20 focus-visible:ring-0 focus-visible:border-blue-500 bg-transparent h-12 font-bold"
                  />
                  {isAnalyzing && <RefreshCw className="absolute right-3 top-4 w-4 h-4 animate-spin text-blue-500" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Car Style</Label>
                  <select 
                    className="w-full h-12 rounded-none border border-black dark:border-white/20 bg-transparent px-3 font-bold text-sm focus:outline-none focus:border-blue-500"
                    value={attributes.style}
                    onChange={(e) => setAttributes({...attributes, style: e.target.value})}
                  >
                    {['Classic', 'Street Racer', 'Cyberpunk', 'Off-road', 'Vintage'].map(s => (
                      <option key={s} value={s} className="bg-white dark:bg-black">{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Packaging</Label>
                  <select 
                    className="w-full h-12 rounded-none border border-black dark:border-white/20 bg-transparent px-3 font-bold text-sm focus:outline-none focus:border-blue-500"
                    value={attributes.packagingStyle}
                    onChange={(e) => setAttributes({...attributes, packagingStyle: e.target.value})}
                  >
                    {['Mainline', 'Treasure Hunt', 'Super Treasure Hunt', 'Retro Entertainment', 'Premium Real Riders', 'Anniversary Edition', 'Nightburnerz', 'Boulevard', 'Car Culture', 'Team Transport'].map(s => (
                      <option key={s} value={s} className="bg-white dark:bg-black">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Reference Photo</Label>
                {!selectedImage ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-black dark:border-white/20 p-12 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-500 transition-all duration-300 group bg-black/[0.02] dark:bg-white/[0.02]"
                  >
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white dark:bg-black border border-black/10 dark:border-white/10 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                        <Upload className="w-8 h-8 text-black/40 dark:text-white/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">Click to Upload</p>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">or drag and drop car photo</p>
                      </div>
                      <div className="pt-2">
                        <span className="text-[9px] px-2 py-1 bg-black/5 dark:bg-white/5 font-mono opacity-50">JPG, PNG (MAX 5MB)</span>
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="relative group border-2 border-black dark:border-white/20 overflow-hidden shadow-lg">
                    <img src={selectedImage} alt="Preview" className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Button variant="destructive" size="sm" onClick={() => setSelectedImage(null)} className="rounded-none font-black uppercase tracking-widest text-[10px] h-10 px-6">
                        <X className="w-4 h-4 mr-2" /> Replace Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Preset Name" 
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="rounded-none border-black/10 dark:border-white/10 h-10 text-xs"
                />
                <Button variant="outline" onClick={savePreset} className="rounded-none h-10 border-black dark:border-white/20">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-none text-lg font-black uppercase italic tracking-tighter disabled:opacity-50"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <><RefreshCw className="mr-3 h-6 w-6 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-3 h-6 w-6" /> Generate Mockup</>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-500 text-white font-bold text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Right: Preview Area */}
        <section className="flex-1 bg-slate-100 dark:bg-[#111] p-8 lg:p-16 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-5 dark:opacity-10">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-orange-500 rounded-full blur-[120px]" />
          </div>

          <div className="w-full max-w-2xl relative z-10">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="aspect-[3/4] w-full bg-white dark:bg-black border border-black dark:border-white/10 shadow-2xl flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin mb-8" />
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Printing Card...</h2>
                  <p className="text-sm opacity-50 font-mono">Applying high-gloss finish and blister seal</p>
                </motion.div>
              ) : resultImage ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="aspect-[3/4] w-full bg-white dark:bg-black shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-black dark:border-white/10 relative group">
                    <img 
                      src={resultImage} 
                      alt="Mockup Result" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 border-[20px] border-transparent group-hover:border-blue-500/10 transition-all duration-500 pointer-events-none" />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-14 rounded-none border-black dark:border-white font-black uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                      onClick={reset}
                    >
                      New Creation
                    </Button>
                    <Button 
                      className="flex-1 h-14 rounded-none bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                      onClick={saveToCollection}
                    >
                      <Heart className="w-5 h-5 mr-3 fill-current" /> Save to Collection
                    </Button>
                    <Button 
                      className="flex-1 h-14 rounded-none bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = resultImage;
                        link.download = `hotwheels-${attributes.make}-${attributes.model}.png`;
                        link.click();
                      }}
                    >
                      <Download className="w-5 h-5 mr-3" /> Download 8K
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  className="aspect-[3/4] w-full border-2 border-dashed border-black dark:border-white flex flex-col items-center justify-center text-center p-12"
                >
                  <ImageIcon className="w-32 h-32 mb-6 opacity-20" />
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Awaiting Design</h2>
                  <p className="text-sm font-mono">Fill in the specs to start production</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
          </>
        ) : (
          <section className="flex-1 p-8 lg:p-16 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-12">
              <div className="flex items-center justify-between border-b border-black dark:border-white/10 pb-8">
                <div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">My Collection</h2>
                  <p className="text-sm opacity-50 font-mono mt-2">Your generated Hot Wheels masterpieces</p>
                </div>
                <div className="flex gap-4">
                  {collection.length > 0 && (
                    <div className="flex gap-2">
                      {showClearConfirm ? (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                          <Button 
                            variant="destructive" 
                            onClick={clearCollection}
                            className="rounded-none font-bold uppercase tracking-widest text-xs"
                          >
                            Confirm Clear
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowClearConfirm(false)}
                            className="rounded-none font-bold uppercase tracking-widest text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="destructive" 
                          onClick={() => setShowClearConfirm(true)}
                          className="rounded-none font-bold uppercase tracking-widest text-xs"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Clear All
                        </Button>
                      )}
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setView('generator')}
                    className="rounded-none border-black dark:border-white font-bold uppercase tracking-widest text-xs"
                  >
                    Back to Generator
                  </Button>
                </div>
              </div>

              {collection.length === 0 ? (
                <div className="h-[400px] border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-center">
                  <Library className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-lg font-bold opacity-30">Your collection is empty.</p>
                  <Button 
                    variant="link" 
                    onClick={() => setView('generator')}
                    className="text-blue-600 font-bold uppercase tracking-widest text-xs mt-2"
                  >
                    Start Creating
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {collection.map(item => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group space-y-4"
                    >
                      <div className="aspect-[3/4] relative bg-white dark:bg-black border border-black dark:border-white/10 shadow-lg overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={`${item.attributes.make} ${item.attributes.model}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center space-y-4">
                          <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest text-blue-500">{item.attributes.packagingStyle}</p>
                            <p className="text-lg font-black uppercase italic tracking-tighter text-white">{item.attributes.make} {item.attributes.model}</p>
                            <p className="text-[10px] font-bold opacity-50 text-white">{item.date}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="rounded-none border-white text-white hover:bg-white hover:text-black"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = item.image;
                                link.download = `hotwheels-${item.attributes.make}-${item.attributes.model}.png`;
                                link.click();
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="destructive" 
                              className="rounded-none"
                              onClick={() => removeFromCollection(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

