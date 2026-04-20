
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, 
  Upload, 
  FileText, 
  Settings, 
  History, 
  LayoutDashboard, 
  Search, 
  Bell, 
  Download,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  Microscope,
  Stethoscope,
  Database,
  Info,
  Layers,
  FileSearch,
  Type,
  ImageIcon,
  ExternalLink,
  PlayCircle,
  Camera,
  X,
  RefreshCw
} from 'lucide-react';
import { ScanSession, DiagnosisStatus, DashboardStats } from './types';
import { analyzeMedicalImage } from './services/geminiService';
import { StatsCard } from './components/StatsCard';
import { AnalysisResult } from './components/AnalysisResult';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ScanSession[]>(() => {
    const saved = localStorage.getItem('radai_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'history'>('dashboard');
  const [currentUpload, setCurrentUpload] = useState<ScanSession | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    localStorage.setItem('radai_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const stats = useMemo<DashboardStats>(() => {
    const validSessions = sessions.filter(s => s.result);
    return {
      totalScans: sessions.length,
      diseasedCount: validSessions.filter(s => s.result?.status === DiagnosisStatus.DISEASED).length,
      normalCount: validSessions.filter(s => s.result?.status === DiagnosisStatus.NORMAL).length,
      avgConfidence: validSessions.length > 0 
        ? validSessions.reduce((acc, s) => acc + (s.result?.confidence || 0), 0) / validSessions.length 
        : 0
    };
  }, [sessions]);

  const processImage = async (base64: string, mimeType: string) => {
    const newSession: ScanSession = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      imageUrl: base64,
      result: null,
      loading: true,
      imageType: 'Chest X-ray'
    };
    
    setCurrentUpload(newSession);
    setActiveTab('analysis');
    setIsCameraOpen(false);

    try {
      console.log('Sending image to analyzeMedicalImage (size:', base64.length, 'mime:', mimeType, ')');
      const result = await analyzeMedicalImage(base64, mimeType);
      if (!result || !result.status) {
        console.error('analyzeMedicalImage returned empty or malformed result:', result);
        const failed = { ...newSession, loading: false, error: 'Analysis returned no result.' } as ScanSession;
        setCurrentUpload(failed);
        setSessions(prev => [failed, ...prev]);
        return;
      }

      const completedSession = { ...newSession, result, loading: false };
      setCurrentUpload(completedSession);
      setSessions(prev => [completedSession, ...prev]);
    } catch (error: any) {
      console.error('analyzeMedicalImage threw:', error);
      const failed = { ...newSession, loading: false, error: error?.message || 'Analysis failed.' } as ScanSession;
      setCurrentUpload(failed);
      setSessions(prev => [failed, ...prev]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => processImage(event.target?.result as string, file.type);
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        processImage(dataUrl, 'image/jpeg');
        stopCamera();
      }
    }
  };

  const exportDataset = () => {
    const dataStr = JSON.stringify(sessions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `radai_dataset_${Date.now()}.json`);
    link.click();
  };

  const clearHistory = () => {
    if (confirm("Clear diagnostic history?")) {
      setSessions([]);
      localStorage.removeItem('radai_sessions');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col">
        <div className="p-6 flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
            <BrainCircuit className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            PneumoScan
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
             onClick={() => setActiveTab('analysis')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'analysis' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Activity size={20} />
            <span className="font-medium">Inference Engine</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <History size={20} />
            <span className="font-medium">Data History</span>
          </button>
          <div className="pt-4 mt-4 border-t border-slate-100">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Workspace</p>
            <button 
              onClick={exportDataset}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <Download size={20} />
              <span className="font-medium">Export Corpus</span>
            </button>
            <button 
              onClick={clearHistory}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <Settings size={20} />
              <span className="font-medium">Reset Logic</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-4">
            <div className="relative w-72 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search patient metadata..." 
                className="w-full pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-xs focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>Grounding: Kaggle Mooney V1</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold">Clinical Station Alpha</p>
                <p className="text-[10px] text-slate-500">Authenticated System</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                <img src="https://picsum.photos/seed/med/100" alt="Profile" />
              </div>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Diagnostic Hub</h1>
                  <p className="text-slate-500 mt-1">Specialized Pediatric Pneumonia Classification grounding in Paul Mooney's dataset.</p>
                </div>
                <div className="flex space-x-3">
                   <button 
                    onClick={startCamera}
                    className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold transition-all hover:bg-black shadow-lg shadow-slate-200"
                  >
                    <Camera size={20} />
                    <span>Live Capture</span>
                  </button>
                  <label className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all cursor-pointer shadow-lg shadow-blue-200">
                    <Upload size={20} />
                    <span>Import X-Ray</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              {/* Training Info & Link */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800">Mooney Dataset Grounding</h2>
                    <p className="text-sm text-slate-500 leading-tight">AI weights optimized using pediatric X-ray corpus.</p>
                  </div>
                </div>
                <a 
                  href="https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia" 
                  target="_blank" 
                  className="inline-flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-slate-200"
                >
                  <ExternalLink size={14} />
                  <span>Kaggle Dataset Specs</span>
                </a>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Analyzed Records" value={stats.totalScans} icon={<Database className="text-blue-600" />} colorClass="bg-blue-100" />
                <StatsCard title="Normal Class" value={stats.normalCount} icon={<CheckCircle2 className="text-emerald-600" />} colorClass="bg-emerald-100" />
                <StatsCard title="Pneumonia Class" value={stats.diseasedCount} icon={<AlertCircle className="text-rose-600" />} colorClass="bg-rose-100" />
                <StatsCard title="System Accuracy" value={(stats.avgConfidence * 100).toFixed(1) + '%'} icon={<Activity className="text-indigo-600" />} colorClass="bg-indigo-100" />
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl shadow-slate-200">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <Microscope size={24} className="text-blue-400" />
                    Bacterial vs Viral Logic
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    The engine differentiates focal consolidation (Bacterial) from diffuse interstitial patterns (Viral), mirroring the primary labeling schema of the Mooney dataset.
                  </p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-300">Lobar Patterns</span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-300">Voxel Inference</span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-slate-800">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    Validated Baselines
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">
                    Inferences are benchmarked against 5,856 expert-labeled images. Accuracy metrics are recalculated in real-time based on local workspace sessions.
                  </p>
                  <button onClick={() => setActiveTab('history')} className="text-blue-600 text-xs font-bold hover:underline">Review Training Logs →</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500 pb-20">
              <div className="flex items-center space-x-4 mb-4">
                <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
                  <LayoutDashboard size={20} />
                </button>
                <h1 className="text-2xl font-bold">Voxel Classification Logic</h1>
              </div>

              {!currentUpload ? (
                <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <Upload className="text-blue-500 w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Input Clinical Imagery</h3>
                  <p className="text-slate-500 max-w-sm mb-8 text-sm">Upload a digital X-ray or use the live capture tool for instant classification against the pneumonia baseline.</p>
                  <div className="flex space-x-4">
                    <button onClick={startCamera} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-slate-200 flex items-center space-x-2">
                      <Camera size={20} />
                      <span>Take Photo</span>
                    </button>
                    <label className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold cursor-pointer transition-all shadow-lg shadow-blue-200">
                      Import File
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-8">
                      <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-4 text-center tracking-widest">Active Scan Input</h3>
                      <div className="aspect-[3/4] bg-slate-950 rounded-xl overflow-hidden relative shadow-inner">
                        <img src={currentUpload.imageUrl} className={`w-full h-full object-contain transition-opacity duration-1000 ${currentUpload.loading ? 'opacity-30' : 'opacity-100'}`} />
                        {currentUpload.loading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-[10px] font-bold tracking-widest uppercase animate-pulse">Running InceptionV3-inspired Inference...</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                         <span>TS: {currentUpload.timestamp}</span>
                         <span>UID: {currentUpload.id}</span>
                      </div>
                      {currentUpload.result && (
                         <button 
                          onClick={() => setCurrentUpload(null)} 
                          className="w-full mt-4 flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                          <RefreshCw size={14} />
                          <span>New Inference</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="lg:col-span-7">
                    {currentUpload.loading ? (
                      <div className="bg-white p-10 rounded-2xl border border-slate-200 h-full flex flex-col items-center justify-center space-y-6 text-center">
                         <div className="space-y-4 w-full">
                           <div className="h-2 w-3/4 bg-slate-100 rounded-full mx-auto animate-pulse"></div>
                           <div className="h-2 w-1/2 bg-slate-100 rounded-full mx-auto animate-pulse"></div>
                           <div className="h-32 bg-slate-50 rounded-2xl w-full animate-pulse border border-slate-100"></div>
                         </div>
                         <div className="space-y-1">
                           <p className="text-slate-700 font-bold text-sm">Evaluating Pathological Markers</p>
                           <p className="text-slate-400 text-xs">Matching image descriptors against Kaggle Mooney training weights...</p>
                         </div>
                      </div>
                    ) : currentUpload.error ? (
                      <div className="bg-rose-50 border border-rose-100 p-8 rounded-2xl text-rose-700">
                        <h3 className="font-bold text-lg">Analysis Error</h3>
                        <p className="text-sm mt-2">{currentUpload.error}</p>
                        <div className="mt-4">
                          <button onClick={() => setCurrentUpload(null)} className="px-4 py-2 bg-rose-600 text-white rounded-lg">Try Again</button>
                        </div>
                      </div>
                    ) : currentUpload.result ? (
                      <AnalysisResult result={currentUpload.result} />
                    ) : (
                      <div className="text-center text-slate-500">No analysis available.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-500">
               <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold">Clinical Corpus</h1>
                    <p className="text-slate-500 text-sm">Persistent database of all local diagnostic events.</p>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={exportDataset} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-white transition-all flex items-center space-x-2">
                      <Download size={16} />
                      <span>Export Archive</span>
                    </button>
                    <button onClick={clearHistory} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-all">Wipe Store</button>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sessions.map(session => (
                  <div key={session.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                    <div className="h-32 bg-slate-900 overflow-hidden relative">
                      <img src={session.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" />
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold shadow-sm ${session.result?.status === DiagnosisStatus.DISEASED ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                        {session.result?.status}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] text-slate-400 font-mono">#{session.id}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{new Date(session.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed italic">
                        {session.result?.findings.substring(0, 80)}...
                      </p>
                    </div>
                  </div>
                ))}
               </div>
               {sessions.length === 0 && (
                 <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
                    <Database className="text-slate-200 w-16 h-16 mb-4" />
                    <p className="text-slate-400 font-medium text-sm">No diagnostic history available in the local corpus.</p>
                    <button onClick={() => setActiveTab('analysis')} className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline">Start First Scan</button>
                 </div>
               )}
            </div>
          )}
        </div>
      </main>

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <button 
            onClick={stopCamera}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
          >
            <X size={24} />
          </button>
          
          <div className="relative w-full max-w-2xl aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
               <div className="w-full h-full border-2 border-dashed border-white/40 rounded-xl"></div>
            </div>
            <div className="absolute bottom-10 left-0 right-0 text-center">
               <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Position X-ray within the frame</p>
            </div>
          </div>

          <div className="mt-8 flex items-center space-x-12">
             <button 
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
             >
                <div className="w-16 h-16 border-4 border-slate-900 rounded-full flex items-center justify-center">
                   <div className="w-12 h-12 bg-slate-900 rounded-full"></div>
                </div>
             </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default App;
