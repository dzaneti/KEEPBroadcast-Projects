import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileVideo, 
  Music, 
  Download, 
  MessageSquare, 
  X, 
  Send, 
  Loader2,
  Play,
  User,
  Clock,
  Disc
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { MusicInfo, ChatMessage } from './types';
import { analyzeVideoForMusic, chatWithGemini } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [musicData, setMusicData] = useState<MusicInfo[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Olá! Sou seu assistente KEEP ECAD. Envie um vídeo para extrair os detalhes das músicas, ou me pergunte qualquer coisa!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setMusicData([]); // Reset data for new video
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;
    
    setIsAnalyzing(true);
    try {
      const base64 = await convertToBase64(videoFile);
      const results = await analyzeVideoForMusic(base64, videoFile.type);
      setMusicData(results);
      
      // Add a helpful message to chat
      setChatMessages(prev => [...prev, { 
        role: 'model', 
        content: `Concluí a análise do vídeo! Encontrei ${results.length} faixas de música. Agora você pode exportá-las para o Excel.` 
      }]);
    } catch (error) {
      console.error("Analysis failed:", error);
      setChatMessages(prev => [...prev, { 
        role: 'model', 
        content: "Desculpe, ocorreu um erro ao analisar o vídeo. Por favor, tente um arquivo diferente ou um trecho menor." 
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = () => {
    if (musicData.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(musicData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Music Metadata");
    XLSX.writeFile(workbook, "music_metadata.xlsx");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      history.push({ role: 'user', parts: [{ text: userMessage }] });
      
      const response = await chatWithGemini(history);
      setChatMessages(prev => [...prev, { role: 'model', content: response || "I'm not sure how to respond to that." }]);
    } catch (error) {
      console.error("Chat failed:", error);
      setChatMessages(prev => [...prev, { role: 'model', content: "Desculpe, estou com problemas para me conectar agora." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-bottom border-black/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Music size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-600">KEEP ECAD</h1>
            <p className="text-xs text-[#9e9e9e] font-medium uppercase tracking-wider">Extrator de Músicas para ECAD</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsChatOpen(true)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors relative"
          >
            <MessageSquare size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Preview */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload size={18} className="text-emerald-500" />
              Incluír Video para Transcrição
            </h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
                videoFile ? "border-emerald-200 bg-emerald-50/30" : "border-black/10 hover:border-emerald-400 hover:bg-black/5"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="video/*" 
                className="hidden" 
              />
              
              {videoFile ? (
                <>
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <FileVideo size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium truncate max-w-[200px]">{videoFile.name}</p>
                    <p className="text-sm text-[#9e9e9e]">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoFile(null);
                      setVideoUrl(null);
                    }}
                    className="text-xs text-red-500 font-semibold hover:underline"
                  >
                    Remover arquivo
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-black/5 text-[#9e9e9e] rounded-full flex items-center justify-center">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Clique ou arraste o vídeo aqui</p>
                    <p className="text-sm text-[#9e9e9e]">Formatos MP4, MOV ou AVI recomendados</p>
                  </div>
                </>
              )}
            </div>

            {videoUrl && (
              <div className="mt-6 space-y-4">
                <div className="aspect-video bg-black rounded-xl overflow-hidden relative group">
                  <video 
                    src={videoUrl} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                    isAnalyzing 
                      ? "bg-black/5 text-[#9e9e9e] cursor-not-allowed" 
                      : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analisando Áudio...
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" />
                      Iniciar Extração
                    </>
                  )}
                </button>
              </div>
            )}
          </section>

          <section className="bg-emerald-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Como funciona</h3>
              <p className="text-emerald-100/80 text-sm leading-relaxed">
                Nossa inteligência artificial analisa a faixa de áudio do seu vídeo, identifica as músicas tocadas, 
                detecta os timestamps exatos e busca os nomes das músicas e autores automaticamente.
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
              <Disc size={160} />
            </div>
          </section>
        </div>

        {/* Right Column: Results Table */}
        <div className="lg:col-span-7">
          <section className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Music size={18} className="text-emerald-500" />
                Músicas Identificadas
              </h2>
              
              {musicData.length > 0 && (
                <button 
                  onClick={handleExport}
                  className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-black/80 transition-all"
                >
                  <Download size={16} />
                  Exportar para Excel
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {musicData.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#fcfcfc] border-b border-black/5">
                      <th className="px-6 py-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          Tempo
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Disc size={14} />
                          Nome da Música
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <User size={14} />
                          Autor / Artista
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {musicData.map((item, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx} 
                        className="hover:bg-emerald-50/30 transition-colors group"
                      >
                        <td className="px-6 py-4 font-mono text-sm text-emerald-600 font-medium">
                          {item.time}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-[#9e9e9e] group-hover:text-[#1a1a1a] transition-colors">
                          {item.author}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-[#9e9e9e]">
                  {isAnalyzing ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <Loader2 size={48} className="animate-spin text-emerald-500" />
                      </div>
                      <p className="font-medium">A inteligência artificial está escaneando o áudio...</p>
                      <p className="text-xs">Isso pode levar um minuto dependendo do tamanho do vídeo</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto">
                        <Music size={40} className="opacity-20" />
                      </div>
                      <p className="font-medium">Nenhum metadado extraído ainda</p>
                      <p className="text-sm max-w-[250px]">Adicione um vídeo e clique em "Iniciar Extração" para ver os resultados aqui.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Chatbot Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-black/5"
          >
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-emerald-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Assistente KEEP ECAD</h3>
                  <p className="text-xs text-white/70">Tecnologia Gemini AI</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-emerald-500 text-white rounded-tr-none" 
                      : "bg-[#f5f5f5] text-[#1a1a1a] rounded-tl-none"
                  )}>
                    <Markdown>{msg.content}</Markdown>
                  </div>
                  <span className="text-[10px] text-[#9e9e9e] mt-1 uppercase font-bold tracking-wider">
                    {msg.role === 'user' ? 'Você' : 'KEEP ECAD'}
                  </span>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-[#9e9e9e] text-xs font-medium">
                  <Loader2 size={12} className="animate-spin" />
                  Pensando...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-6 border-t border-black/5 bg-[#fcfcfc]">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pergunte-me qualquer coisa..."
                  className="w-full pl-4 pr-12 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Chat (when closed) */}
      {!isChatOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40"
        >
          <MessageSquare size={24} />
        </motion.button>
      )}
    </div>
  );
}
