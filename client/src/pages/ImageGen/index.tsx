import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Wand2, 
  Download, 
  Settings2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '../../utils/theme';
import { generateImage, saveImageHistory } from '../../services/image';
import { trackActivity } from '../../services/activity';

const STYLES = ['Photorealistic', 'Anime', 'Digital Art', '3D Render', 'Cyberpunk', 'Watercolor'];
const DIMENSIONS = ['1024x1024', '16:9 (1920x1080)', '9:16 (1080x1920)'];

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [selectedDim, setSelectedDim] = useState(DIMENSIONS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedImage(null);
    setErrorMessage(null);

    try {
      const image = await generateImage({
        prompt,
        style: selectedStyle,
        dimension: selectedDim
      });
      setGeneratedImage(image);
      // Persist image history and track as recent activity
      void saveImageHistory(prompt, image);
      void trackActivity('image', prompt);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to generate image';
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = generatedImage;
    anchor.download = `yukti-image-${Date.now()}.png`;
    anchor.click();
  };

  return (
    <div className="depth-section glass-card flex h-[calc(100vh-8rem)] overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-background to-pink-500/8 pointer-events-none" />
      <div className="floating-orb -top-16 left-[15%] h-60 w-60 bg-[rgba(120,120,255,0.35)]" />
      <div className="floating-orb bottom-[5%] right-[8%] h-56 w-56 bg-[rgba(255,120,255,0.25)]" />
      <div className="depth-highlight" />

      {/* Editor Panel */}
      <div className="w-full lg:w-96 border-r border-white/10 bg-black/20 flex flex-col relative z-10 overflow-y-auto backdrop-blur-2xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 metal-button rounded-lg">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold heading-metal">Image Studio</h2>
          </div>
          <p className="text-sm text-gray-400">Transform your imagination into visual art.</p>
        </div>

        <form onSubmit={handleGenerate} className="p-6 flex-1 space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Prompt
            </label>
            <textarea
              className="glass-input w-full h-32 rounded-xl p-3 text-sm focus:outline-none resize-none"
              placeholder="A futuristic city in the clouds at sunset, cyberpunk aesthetic, highly detailed..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-pink-400" />
              Art Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map(style => (
                <div 
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium text-center cursor-pointer transition-all border",
                    selectedStyle === style 
                      ? "metal-button text-purple-200 border-purple-400/40" 
                      : "glass-card text-gray-300"
                  )}
                >
                  {style}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-400" />
              Dimensions
            </label>
            <div className="space-y-2">
              {DIMENSIONS.map(dim => (
                <div 
                  key={dim}
                  onClick={() => setSelectedDim(dim)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all border",
                    selectedDim === dim 
                      ? "metal-button text-purple-200 border-purple-400/40" 
                      : "glass-card text-gray-300"
                  )}
                >
                  {dim}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="metal-button w-full py-3 rounded-xl text-white font-bold disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Generate Image (1 Token)
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Gallery */}
      <div className="depth-content flex-1 p-6 relative z-10 flex flex-col items-center justify-center bg-black/35">
        <div className="w-full max-w-3xl flex-1 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center relative overflow-hidden group glass-card">
          
          {!isGenerating && !generatedImage && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-border flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">Your creation will appear here</p>
            </div>
          )}

          {isGenerating && (
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-pink-400 animate-pulse" />
                </div>
              </div>
              <p className="text-purple-300 font-medium animate-pulse">Summoning pixels...</p>
            </div>
          )}

          {generatedImage && !isGenerating && (
            <>
              <img 
                src={generatedImage} 
                alt="Generated" 
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleDownload}
                  className="metal-button text-white p-3 rounded-xl flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  Download HD
                </button>
              </div>
            </>
          )}

          {errorMessage && !isGenerating && (
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
