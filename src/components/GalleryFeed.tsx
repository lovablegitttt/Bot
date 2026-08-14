import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Clock,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Maximize2,
  X,
  User,
  Zap
} from 'lucide-react';
import { GenerationItem } from '../types';
import { SUPPORTED_MODELS } from '../../server/cloudflare';

interface GalleryFeedProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRemixPrompt?: (prompt: string) => void;
}

export const GalleryFeed: React.FC<GalleryFeedProps> = ({ showToast, onRemixPrompt }) => {
  const [items, setItems] = useState<GenerationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GenerationItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchGallery = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bot/gallery?limit=60');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Prompt copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-sky-400" />
            <h2 className="text-xl font-bold text-slate-100">Creations Gallery & Visual Feed</h2>
          </div>
          <p className="text-sm text-slate-300">
            Live stream of artworks generated through Telegram and the Web Studio.
          </p>
        </div>

        <button
          onClick={fetchGallery}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Gallery Grid */}
      {items.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <ImageIcon className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">No Artworks Generated Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Use the Telegram Bot Simulator or AI Image Studio to craft your first masterpiece.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => {
            const modelName =
              SUPPORTED_MODELS.find((m) => m.id === item.model)?.name.split(' ')[0] || 'FLUX.1';

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg group flex flex-col justify-between transition-all hover:shadow-sky-500/5"
              >
                {/* Image Container */}
                <div
                  onClick={() => setSelectedItem(item)}
                  className="aspect-square bg-slate-950 relative overflow-hidden cursor-pointer"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-2.5 bg-slate-900/90 text-white rounded-xl shadow-lg border border-slate-700">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </div>

                  {/* Model Tag */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/90 text-sky-300 border border-slate-700/80 backdrop-blur-sm">
                      {modelName}
                    </span>
                  </div>

                  {/* Duration Tag */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-700/80 backdrop-blur-sm">
                      {(item.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed font-medium">
                      "{item.prompt}"
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>@{item.username || item.firstName || item.userId.slice(0, 8)}</span>
                      </span>
                      <span>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <button
                      onClick={() => handleCopy(item.prompt, item.id)}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy</span>
                    </button>

                    <a
                      href={item.imageUrl}
                      download={`telecloud-${item.id}.png`}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative">
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Image */}
            <div className="w-full bg-slate-950 flex items-center justify-center">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.prompt}
                referrerPolicy="no-referrer"
                className="max-h-[500px] w-auto object-contain"
              />
            </div>

            {/* Modal Info */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Prompt</span>
                <p className="text-sm text-slate-100 font-medium leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedItem.prompt}
                </p>
              </div>

              {selectedItem.enhancedPrompt && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-purple-400">✨ AI Enhanced Prompt:</span>
                  <p className="text-xs text-slate-300 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    {selectedItem.enhancedPrompt}
                  </p>
                </div>
              )}

              {/* Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">MODEL</span>
                  <span className="font-semibold text-slate-200 truncate block">{selectedItem.model}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">ASPECT RATIO</span>
                  <span className="font-semibold text-slate-200">{selectedItem.aspectRatio || '1:1'}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">GENERATION TIME</span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {(selectedItem.durationMs / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">USER</span>
                  <span className="font-semibold text-sky-400 truncate block">
                    @{selectedItem.username || selectedItem.userId.slice(0, 8)}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleCopy(selectedItem.prompt, selectedItem.id)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </button>
                <a
                  href={selectedItem.imageUrl}
                  download={`telecloud-${selectedItem.id}.png`}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Full Resolution</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
