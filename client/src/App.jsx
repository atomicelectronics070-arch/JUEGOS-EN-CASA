import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Shuffle, Hand, Image, Calendar, Clock, 
  Save, Eye, LogOut, User, Sparkles, Camera,
  Plus, X, Flame, BrainCircuit, Bell, Gift, Lock, Search, Play, Trophy, Trash2, Edit2, 
  Tv, Star, Minus, CheckCircle, Globe, Database, Settings, ShieldAlert
} from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = API_URL === '/api' ? `http://${window.location.hostname}:3001` : API_URL.replace('/api', '');
  return `${baseUrl}${path}`;
};

function triggerConfetti() {
  confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ec4899', '#a855f7', '#ffffff'] });
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [showLogin, setShowLogin] = useState(!token);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('game');
  const [unredeemedCouponsCount, setUnredeemedCouponsCount] = useState(0);

  const fetchNotificationCounts = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/coupons`, { headers: { Authorization: `Bearer ${token}` }});
      setUnredeemedCouponsCount(res.data.filter(c => c.is_redeemed === 0).length);
    } catch(e) {}
  };

  useEffect(() => { if (token) fetchNotificationCounts(); }, [token, currentView]);

  const login = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, { username: loginUsername, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('username', res.data.username);
      setToken(res.data.token); setRole(res.data.role); setUsername(res.data.username); setShowLogin(false);
    } catch (e) { setError(e.response?.data?.error || 'Error al iniciar sesión'); }
  };

  const logout = () => {
    localStorage.clear(); setToken(null); setRole(null); setUsername(''); setShowLogin(true);
  };

  if (showLogin || !token) return <Login onLogin={login} username={loginUsername} setUsername={setLoginUsername} password={password} setPassword={setPassword} error={error} />;

  return (
    <div className="min-h-screen flex">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} role={role} logout={logout} unredeemedCouponsCount={unredeemedCouponsCount} />
      <main className="flex-1 p-8 h-screen overflow-y-auto">
        {role === 'admin' && currentView === 'admin' && <AdminPanel token={token} />}
        {currentView === 'game' && <GameView token={token} />}
        {currentView === 'citas' && <CitasView token={token} />}
        {currentView === 'recuerdos' && <RecuerdosView token={token} />}
        {currentView === 'series' && <SeriesView token={token} />}
        {currentView === 'trivia' && <TriviaView token={token} />}
        {currentView === 'spicy' && <SpicyView token={token} />}
        {currentView === 'truth_dare' && <TruthDareView token={token} />}
        {currentView === 'coupons' && <CouponsView token={token} fetchCounts={fetchNotificationCounts} />}
      </main>
    </div>
  );
}

function Login({ onLogin, username, setUsername, password, setPassword, error }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 mb-4"><Heart className="w-10 h-10 text-white" fill="currentColor" /></motion.div>
          <h1 className="text-3xl font-bold text-white">Línea de tiempo</h1>
          <p className="text-[10px] text-pink-400 mt-1">con amor para Andrea Leon</p>
        </div>
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 text-center">{error}</div>}
        <div className="space-y-4">
          <input type="text" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-pink-500" />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-pink-500" />
          <button onClick={onLogin} className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:opacity-90">Iniciar Sesión</button>
        </div>
      </motion.div>
    </div>
  );
}

function Sidebar({ currentView, setCurrentView, role, logout, unredeemedCouponsCount }) {
  const isAdmin = role === 'admin';
  return (
    <aside className="w-72 glass min-h-screen p-4 flex flex-col z-20">
      <div className="text-center py-6 border-b border-white/10 mb-6">
        <Heart className="w-10 h-10 text-pink-500 mx-auto mb-2" fill="currentColor" />
        <h2 className="text-white font-bold text-xl">Línea de tiempo</h2>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto w-full">
        <SidebarBtn icon={Sparkles} label="Citas Sorpresa" active={currentView === 'game'} onClick={() => setCurrentView('game')} />
        <SidebarBtn icon={Calendar} label="Historial de Citas" active={currentView === 'citas'} onClick={() => setCurrentView('citas')} />
        <SidebarBtn icon={Image} label="Recuerdos" active={currentView === 'recuerdos'} onClick={() => setCurrentView('recuerdos')} />
        <SidebarBtn icon={Tv} label="Series Vistas" active={currentView === 'series'} onClick={() => setCurrentView('series')} />
        
        <div className="my-4 border-t border-white/10"></div>
        <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Juegos de Pareja</p>
        <SidebarBtn icon={BrainCircuit} label="Trivia" active={currentView === 'trivia'} onClick={() => setCurrentView('trivia')} />
        <SidebarBtn icon={Flame} label="Juegos Pícaros" active={currentView === 'spicy'} onClick={() => setCurrentView('spicy')} />
        <SidebarBtn icon={ShieldAlert} label="Verdad o Reto" active={currentView === 'truth_dare'} onClick={() => setCurrentView('truth_dare')} />
        <SidebarBtn icon={Gift} label="Vales Especiales" active={currentView === 'coupons'} onClick={() => setCurrentView('coupons')} badge={unredeemedCouponsCount} />
        
        {isAdmin && (
          <>
            <div className="my-4 border-t border-white/10"></div>
            <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Administrador</p>
            <SidebarBtn icon={Settings} label="Configuraciones" active={currentView === 'admin'} onClick={() => setCurrentView('admin')} />
          </>
        )}
      </nav>
      <button onClick={logout} className="flex items-center justify-center gap-3 w-full py-3 mt-4 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors border border-white/10"><LogOut size={20} /><span>Salir</span></button>
    </aside>
  );
}

function SidebarBtn({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${active ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
      <div className="flex items-center gap-3"><Icon size={20} className={active ? 'text-pink-400' : ''} /><span className="font-medium text-sm text-left truncate">{label}</span></div>
      {badge > 0 && <span className="bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );
}

// -------------------------------------------------------------
// SERIES VIEW
// -------------------------------------------------------------
function SeriesView({ token }) {
  const [series, setSeries] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => { load(); }, []);
  const load = () => axios.get(`${API_URL}/series`, { headers: { Authorization: `Bearer ${token}` } }).then(res => setSeries(res.data));

  const addSerie = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    await axios.post(`${API_URL}/series`, { title: newTitle }, { headers: { Authorization: `Bearer ${token}` } });
    setNewTitle(''); load();
  };

  const updateSerie = async (s, increment, is_finished_flag = null) => {
    const data = { episodes_seen: increment ? s.episodes_seen + 1 : s.episodes_seen - 1, is_finished: is_finished_flag !== null ? is_finished_flag : s.is_finished };
    if (data.episodes_seen < 0) data.episodes_seen = 0;
    await axios.put(`${API_URL}/series/${s.id}`, data, { headers: { Authorization: `Bearer ${token}` } });
    if(is_finished_flag === 1) triggerConfetti();
    load();
  };

  const deleteSerie = async (id) => {
    if(!confirm('¿Eliminar serie de la lista?')) return;
    await axios.delete(`${API_URL}/series/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center glass p-8 rounded-3xl mb-8">
        <Tv className="w-16 h-16 text-pink-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">Series Vistas 🍿</h1>
        <p className="text-gray-400">Controla por qué capítulo van o guárdalas para el recuerdo.</p>
      </header>

      <form onSubmit={addSerie} className="flex gap-4 glass p-4 rounded-xl items-center">
        <input value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} type="text" placeholder="Escribe el nombre de la nueva serie..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500"/>
        <button type="submit" className="px-6 py-3 bg-pink-500 hover:bg-pink-400 text-white rounded-xl font-bold flex items-center gap-2"><Plus/> Añadir Serie</button>
      </form>

      <div className="space-y-4">
        {series.map(s => (
          <div key={s.id} className={`p-6 rounded-2xl flex items-center justify-between border ${s.is_finished ? 'bg-black/30 border-black/50 opacity-60' : 'glass border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]'}`}>
             <div>
                <h3 className={`text-2xl font-bold mb-1 ${s.is_finished ? 'text-gray-400 line-through' : 'text-white'}`}>{s.title}</h3>
                <p className="text-pink-400 text-sm font-bold flex items-center gap-2">
                  <Play size={14}/> Capítulos Vistos: <span className="bg-white/10 text-white px-3 py-1 rounded-full text-lg">{s.episodes_seen}</span>
                </p>
             </div>
             <div className="flex items-center gap-3">
                {!s.is_finished && (
                  <div className="flex flex-col gap-1 mr-4 border-r border-white/10 pr-4">
                     <button onClick={()=>updateSerie(s, true)} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded"><Plus size={16}/></button>
                     <button onClick={()=>updateSerie(s, false)} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded"><Minus size={16}/></button>
                  </div>
                )}
                {!s.is_finished ? (
                  <button onClick={()=>updateSerie(s, true, 1)} className="px-4 py-3 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded-xl font-bold flex items-center gap-2 border border-green-500/50 transition-colors"><CheckCircle size={18}/> Finalizado</button>
                ): (
                  <button onClick={()=>updateSerie(s, true, 0)} className="px-4 py-3 bg-white/5 text-gray-400 hover:bg-white/10 rounded-xl font-bold">Desmarcar</button>
                )}
                <button onClick={()=>deleteSerie(s.id)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"><Trash2 size={20}/></button>
             </div>
          </div>
        ))}
        {series.length === 0 && <p className="text-center text-gray-500 py-10">No hay series. ¡Añade la primera!</p>}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// REUSABLE GAME ENGINE
// -------------------------------------------------------------
function GameEngine({ token, gameTitle, apiEndpoint, isTrivia, children }) {
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState('local'); // local | ai
  const [player1, setPlayer1] = useState('Player 1');
  const [player2, setPlayer2] = useState('Player 2');
  const [targetScore, setTargetScore] = useState(5);
  
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [turn, setTurn] = useState(1); // 1 or 2
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [winner, setWinner] = useState(null);

  // Local Pool
  const [localPool, setLocalPool] = useState([]);
  
  useEffect(() => {
    if(!playing) {
      axios.get(`${API_URL}/${apiEndpoint}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => setLocalPool(res.data));
    }
  }, [playing, token, apiEndpoint]);

  const startGame = () => {
    setScores({ p1: 0, p2: 0 });
    setTurn(1);
    setWinner(null);
    setPlaying(true);
    nextQuestion();
  };

  const nextQuestion = async () => {
    setIsLoadingQuestion(true);
    setCurrentQuestion(null);
    if(mode === 'local' || isTrivia) { // IA Trivia options format is complex, forces Local.
      const pool = localPool;
      if (pool.length === 0) { alert('No hay preguntas en BD.'); setPlaying(false); return; }
      setCurrentQuestion(pool[Math.floor(Math.random() * pool.length)]);
    } else {
      try {
        const favs = localPool.filter(x => x.is_favorite).map(x => x.challenge || x.question).slice(0,5).join(', ');
        const res = await axios.post(`${API_URL}/generate-ai`, { game_type: gameTitle, context_favorites: favs }, { headers: { Authorization: `Bearer ${token}` } });
        setCurrentQuestion({ id: 'ai_' + Date.now(), is_ai: true, text: res.data.question });
      } catch (e) {
        alert(e.response?.data?.error || 'Falló IA, usando local.');
        setCurrentQuestion(localPool[Math.floor(Math.random() * localPool.length)]);
      }
    }
    setIsLoadingQuestion(false);
  };

  const handleScore = (success) => {
    if(success) {
      const newScores = { ...scores, [turn === 1 ? 'p1' : 'p2']: scores[turn===1?'p1':'p2'] + 1 };
      setScores(newScores);
      if(newScores[turn===1?'p1':'p2'] >= targetScore) {
        setWinner(turn === 1 ? player1 : player2);
        triggerConfetti();
        return;
      }
    }
    setTurn(turn === 1 ? 2 : 1);
    nextQuestion();
  };

  const toggleFavorite = async (id, isFav) => {
    if (String(id).startsWith('ai')) return alert('La IA no se puede guardar en favs directo por ahora.');
    await axios.put(`${API_URL}/${apiEndpoint}/favorite/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setCurrentQuestion({ ...currentQuestion, is_favorite: !isFav });
  };

  if (winner) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <motion.div initial={{scale:0}} animate={{scale:1}} className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-yellow-500 flex items-center justify-center mb-6"><Trophy size={64} className="text-white" /></motion.div>
        <h2 className="text-4xl font-bold text-white mb-2">¡{winner} es Campeón/a!</h2>
        <p className="text-2xl text-pink-400 mb-8 p-4 rounded-xl bg-pink-500/10">Llegó a {targetScore} Puntos.</p>
        <button onClick={() => setPlaying(false)} className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold">Volver al Setup</button>
      </div>
    );
  }

  if (playing) {
    const cp = turn === 1 ? player1 : player2;
    return (
      <div className="max-w-2xl mx-auto space-y-8 mt-10">
        <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/10">
           <div className={`p-4 rounded-xl border-2 transition-all ${turn === 1 ? 'border-pink-500 bg-pink-500/20 shadow-[0_0_20px_rgba(236,72,153,0.3)]' : 'border-transparent text-gray-500'}`}>
              <p className="text-xs uppercase font-bold mb-1">Jugador 1</p><p className="text-xl font-bold">{player1}: {scores.p1} pts</p>
           </div>
           <div className="text-center px-4">
              <span className="text-xs uppercase text-gray-500 tracking-widest block mb-1">Meta</span>
              <span className="bg-white/10 px-4 py-2 rounded-full font-bold text-white text-xl">{targetScore}</span>
           </div>
           <div className={`p-4 rounded-xl border-2 transition-all text-right ${turn === 2 ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-transparent text-gray-500'}`}>
              <p className="text-xs uppercase font-bold mb-1">Jugador 2</p><p className="text-xl font-bold">{player2}: {scores.p2} pts</p>
           </div>
        </div>

        <div className="glass p-12 rounded-3xl relative text-center min-h-[300px] flex flex-col justify-center">
          {currentQuestion && !currentQuestion.is_ai && (
             <button onClick={() => toggleFavorite(currentQuestion.id, currentQuestion.is_favorite)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors">
               <Star className={`w-8 h-8 ${currentQuestion.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
             </button>
          )}
          {isLoadingQuestion ? (
             <div className="animate-pulse text-xl text-pink-400 font-bold">{mode === 'ai' ? '🧠 La IA está pensando un reto creativo...' : 'Cargando...'}</div>
          ) : (
             <>
               <h3 className="text-pink-400 font-black uppercase text-xl mb-4 tracking-widest border-b border-pink-500/30 pb-4 inline-block mx-auto">TURNO DE {cp}</h3>
               {children(currentQuestion, handleScore)}
             </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <header className="text-center mb-8 glass p-8 rounded-3xl">
         <h1 className="text-4xl font-black text-white mb-2">{gameTitle}</h1>
         <p className="text-gray-400 text-sm">Configuración de partida</p>
      </header>

      <div className="glass p-8 rounded-3xl space-y-6">
         <div className="grid grid-cols-2 gap-4">
           <div><label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nombre Jugador 1</label><input type="text" value={player1} onChange={e=>setPlayer1(e.target.value)} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-pink-500"/></div>
           <div><label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nombre Jugador 2</label><input type="text" value={player2} onChange={e=>setPlayer2(e.target.value)} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-purple-500"/></div>
         </div>
         
         <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Puntaje Meta para ganar</label>
            <div className="flex gap-2">
               {[1, 3, 5, 10, 15].map(n => (
                 <button key={n} onClick={()=>setTargetScore(n)} className={`flex-1 py-3 rounded-xl border transition-all font-bold ${targetScore === n ? 'bg-pink-500 text-white border-pink-500' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}>{n}</button>
               ))}
            </div>
         </div>

         {!isTrivia && (
           <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Cerebro / Dificultad</label>
              <div className="flex gap-4">
                 <button onClick={()=>setMode('local')} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 border font-bold ${mode==='local'?'bg-blue-600 border-blue-500 text-white':'bg-white/5 border-white/10 text-gray-400'}`}><Database size={18}/> Preguntas Locales ({localPool.length})</button>
                 <button onClick={()=>setMode('ai')} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 border font-bold ${mode==='ai'?'bg-gradient-to-r from-pink-500 to-purple-600 border-transparent text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]':'bg-white/5 border-white/10 text-gray-400'}`}><Globe size={18}/> IA (Internet Infinito)</button>
              </div>
           </div>
         )}

         <button onClick={startGame} className="w-full py-5 rounded-2xl bg-white text-black font-black text-2xl hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">EMPEZAR PARTIDA</button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SPECIFIC GAMES IMPLEMENTATIONS
// -------------------------------------------------------------
function TruthDareView({ token }) {
  return (
    <GameEngine token={token} gameTitle="Verdad o Reto 🎭" apiEndpoint="truth-dare" isTrivia={false}>
      {(q, handleScore) => q && (
        <div className="fade-in">
           <span className={`px-4 py-1 rounded-full text-sm font-bold uppercase mb-6 inline-block ${q.is_ai ? 'bg-purple-900 border border-purple-500 text-purple-300' : 'bg-blue-900 border border-blue-500 text-blue-300'}`}>
              {q.is_ai ? 'Inteligencia Artificial' : q.type}
           </span>
           <h2 className="text-3xl font-bold text-white mb-10 leading-relaxed">{q.text || q.question}</h2>
           
           <div className="flex gap-4 max-w-sm mx-auto">
             <button onClick={() => handleScore(false)} className="flex-1 py-4 rounded-xl bg-red-500/20 text-red-400 font-bold border border-red-500/50 hover:bg-red-500 hover:text-white transition-colors">SE RAJÓ (0)</button>
             <button onClick={() => handleScore(true)} className="flex-1 py-4 rounded-xl bg-green-500/20 text-green-400 font-bold border border-green-500/50 hover:bg-green-500 hover:text-white transition-colors">CUMPLIÓ (+1)</button>
           </div>
        </div>
      )}
    </GameEngine>
  );
}

function SpicyView({ token }) {
  return (
    <GameEngine token={token} gameTitle="Juegos Pícaros 🌶️" apiEndpoint="spicy-games" isTrivia={false}>
      {(q, handleScore) => q && (
        <div className="fade-in">
           {!q.is_ai && <span className="px-4 py-1 rounded-full text-sm font-bold uppercase mb-4 inline-block bg-red-900 border border-red-500 text-red-300">Nivel: {q.level}</span>}
           <h2 className="text-3xl font-bold text-white mb-4 leading-relaxed">{q.title || 'IA Salvaje'}</h2>
           <p className="text-xl text-gray-300 italic mb-10">"{q.text || q.challenge}"</p>
           
           <div className="flex gap-4 max-w-sm mx-auto">
             <button onClick={() => handleScore(false)} className="flex-1 py-4 rounded-xl bg-gray-500/20 text-gray-400 font-bold hover:bg-gray-500 hover:text-white transition-colors">PASAR TURNO</button>
             <button onClick={() => handleScore(true)} className="flex-1 py-4 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-colors">HECHO (+1)</button>
           </div>
        </div>
      )}
    </GameEngine>
  );
}

function TriviaView({ token }) {
  const [selectedLetter, setSelectedLetter] = useState(null);

  const handleTriviaAnswer = (letter, q, handleScore) => {
    setSelectedLetter(letter);
    const correct = letter === q.correcta;
    setTimeout(() => {
      setSelectedLetter(null);
      handleScore(correct);
    }, 1500);
  };

  return (
    <GameEngine token={token} gameTitle="Trivia en Pareja 🧠" apiEndpoint="trivia" isTrivia={true}>
      {(q, handleScore) => q && (
        <div className="fade-in text-left">
           <h2 className="text-2xl font-bold text-white mb-8 text-center">{q.pregunta}</h2>
           <div className="grid grid-cols-1 gap-4">
            {['A', 'B', 'C'].map(letter => {
              const isSelected = selectedLetter === letter;
              const isCorrect = q.correcta === letter;
              const optionText = letter === 'A' ? q.opcion_a : letter === 'B' ? q.opcion_b : q.opcion_c;
              let btnClass = "border-white/10 hover:border-pink-500/50 bg-white/5 hover:bg-white/10 text-white";
              if (selectedLetter) {
                if (isCorrect) btnClass = "border-green-500 bg-green-500/20 text-green-300";
                else if (isSelected && !isCorrect) btnClass = "border-red-500 bg-red-500/20 text-red-300";
                else btnClass = "border-white/5 bg-white/5 opacity-50 text-gray-500";
              }
              return (
                <button key={letter} disabled={!!selectedLetter} onClick={() => handleTriviaAnswer(letter, q, handleScore)}
                  className={`p-5 rounded-2xl border text-xl font-medium transition-all text-left flex items-center gap-4 ${btnClass}`}>
                  <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold flex-shrink-0">{letter}</span>
                  {optionText}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </GameEngine>
  );
}


// -------------------------------------------------------------
// CITAS VIEW
// -------------------------------------------------------------
function CitasView({ token }) {
  const [citas, setCitas] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ title: '', detail: '', date: '' });

  const load = () => axios.get(`${API_URL}/citas`, { headers: { Authorization: `Bearer ${token}` }}).then(res => setCitas(res.data));
  useEffect(() => { load(); }, [token]);

  const addManual = async (e) => {
    e.preventDefault();
    await axios.post(`${API_URL}/assign-option`, { option_type: 'Manual', url: manual.title, dedicatoria: manual.detail, fecha_invitacion: 'Agregada Manualmente', fecha_cita: manual.date }, { headers: { Authorization: `Bearer ${token}` }});
    setShowManual(false); setManual({title:'', detail:'', date:''}); triggerConfetti(); load();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex justify-between items-center glass p-8 rounded-3xl mb-8">
        <div>
           <h1 className="text-4xl font-bold text-white mb-2">Mis Citas</h1>
           <p className="text-gray-400">Nuestro historial de citas jugadas o vividas.</p>
        </div>
        <button onClick={()=>setShowManual(!showManual)} className="px-6 py-3 bg-pink-500 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-pink-400"><Plus size={18}/> Cita Manual</button>
      </header>

      {showManual && (
        <form onSubmit={addManual} className="glass p-6 rounded-2xl mb-8 space-y-4">
          <h3 className="text-white font-bold text-xl mb-4">Añadir cita ocurrida en la vida real</h3>
          <input required placeholder="Lugar o Título (Ej: Cine)" value={manual.title} onChange={e=>setManual({...manual, title: e.target.value})} className="w-full p-3 rounded-xl bg-white/5 text-white border border-white/10 outline-none focus:border-pink-500" />
          <textarea placeholder="Detalles, anécdotas, etc..." value={manual.detail} onChange={e=>setManual({...manual, detail: e.target.value})} className="w-full p-3 rounded-xl bg-white/5 text-white border border-white/10 outline-none focus:border-pink-500" />
          <input required type="date" value={manual.date} onChange={e=>setManual({...manual, date: e.target.value})} className="w-full p-3 rounded-xl bg-white/5 text-white border border-white/10 outline-none focus:border-pink-500" />
          <button type="submit" className="w-full py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl">Guardar en el Historial</button>
        </form>
      )}

      {citas.length === 0 ? (
        <div className="text-center py-20 px-8 glass rounded-3xl"><Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" /><p className="text-gray-500">No hay citas guardadas</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {citas.map((cita) => (
            <motion.div key={cita.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`glass rounded-2xl p-6 relative overflow-hidden border-2 ${cita.option_type==='Manual'?'border-blue-500/30':'border-pink-500/20'}`}>
              <div className="absolute top-0 right-0 p-4 opacity-10"><Heart size={64}/></div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mb-4 text-xs tracking-tighter">{cita.option_type}</div>
              <p className="text-white font-bold text-lg mb-3 break-all">{cita.url}</p>
              {cita.dedicatoria && <p className="text-gray-300 italic mb-4 max-h-24 overflow-y-auto">"{cita.dedicatoria}"</p>}
              <div className="flex justify-between items-center text-sm pt-4 border-t border-white/10">
                 <span className="text-pink-400 flex items-center gap-1"><Clock size={14}/> Cita: {cita.fecha_cita}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// GAME VIEW (El Random Clásico y Puro de Citas)
// -------------------------------------------------------------
function GameView({ token }) {
  const [options, setOptions] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [gameState, setGameState] = useState('prompt');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => { axios.get(`${API_URL}/options`, { headers: { Authorization: `Bearer ${token}` }}).then(res => setOptions(res.data)); }, [token]);

  const selectManual = (option) => {
    setSelectedCard(option);
    setGameState('revealed');
    axios.post(`${API_URL}/assign-option`, option, { headers: { Authorization: `Bearer ${token}` }});
    triggerConfetti();
  };
  const categories = [...new Set(options.map(o => o.category))];

  return (
    <div className="space-y-8">
      <header className="text-center"><h1 className="text-4xl font-bold text-white mb-2">Citas Clásicas al Azar</h1></header>
      
      {gameState === 'prompt' && (
        <div className="flex flex-col items-center p-12 glass rounded-3xl max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center uppercase">Elige la carta Sorpresa de Cita</h2>
          <div className="w-full mb-8 border border-white/10 p-4 rounded-2xl bg-white/5">
            <h3 className="text-white mb-4 text-center text-sm font-bold opacity-70 uppercase">Filtrar por Energía/Mood</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full text-sm font-bold border transition ${!selectedCategory ? 'bg-pink-500 text-white border-pink-500' : 'border-white/20 text-gray-400'}`}>TODAS</button>
              {categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-bold border transition ${selectedCategory === cat ? 'bg-pink-500 text-white border-pink-500' : 'border-white/20 text-gray-400'}`}>{cat}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {(selectedCategory ? options.filter(o => o.category === selectedCategory) : options).map((opt) => (
              <button key={opt.id} onClick={() => selectManual(opt)} className="h-64 w-full bg-gradient-to-br from-purple-900 to-pink-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-transform group">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center font-bold text-4xl text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-all">{opt.option_type}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === 'revealed' && selectedCard && (
         <div className="max-w-xl mx-auto glass rounded-3xl p-8 text-center relative overflow-hidden">
            <h2 className="text-3xl font-bold text-white mb-2">¡Asignada Opción {selectedCard.option_type}!</h2>
            <a href={selectedCard.url} target="_blank" rel="noopener noreferrer" className="block text-pink-400 hover:underline mb-4 font-bold text-xl">{selectedCard.url}</a>
            <p className="text-white italic bg-white/5 p-4 rounded-xl mb-4">"{selectedCard.dedicatoria}"</p>
            <p className="text-gray-400 font-bold mb-8">Fecha: {selectedCard.fecha_cita}</p>
            <button onClick={() => {setGameState('prompt'); setSelectedCard(null);}} className="w-full bg-white/10 text-white py-3 rounded-xl font-bold hover:bg-white/20">Volver a jugar</button>
         </div>
      )}
    </div>
  );
}


// Rest unchanged: AdminPanel (add Truth_dare Config + Config TAB) and Recuerdos
function AdminPanel({ token }) {
  const [tab, setTab] = useState('config');
  // Simple Config AI setup
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if(tab === 'config') axios.get(`${API_URL}/config`, { headers: { Authorization: `Bearer ${token}` }}).then(res => {
      const k = res.data.find(c => c.key === 'GEMINI_API_KEY');
      if (k) setApiKey(k.value);
    });
  }, [tab, token]);

  const saveApi = async () => {
    await axios.post(`${API_URL}/config`, { key: 'GEMINI_API_KEY', value: apiKey }, { headers: { Authorization: `Bearer ${token}` } });
    alert('API KEY GOOGLE GEMINI GUARDADA. ¡Modo IA Activado Mágicamente!');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="text-center mb-8 glass rounded-3xl p-8 border border-pink-500/20">
        <h1 className="text-4xl font-black text-white mb-2 uppercase">Centro de Comando Full</h1>
        <p className="text-pink-300 font-medium">Aquí controlas absolutamente todo.</p>
      </header>
      
      <div className="flex flex-wrap border-b border-white/10 mb-8 gap-4 justify-center">
        {[{id:'config', label:'Integración IA'}, {id:'citas', label:'Citas'}, {id:'preguntas', label:'Bancos de Pregs'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-all ${tab === t.id ? 'border-pink-500 text-pink-400 bg-white/5' : 'border-transparent text-gray-500 hover:text-white'}`}>{t.label}</button>
        ))}
      </div>
      
      {tab === 'config' && (
        <div className="max-w-xl mx-auto glass p-8 rounded-3xl">
           <h2 className="text-xl font-bold text-white mb-4">Inteligencia Artificial (Conexión Internet)</h2>
           <p className="text-sm text-gray-400 mb-6 border-l-4 border-pink-500 pl-3">Para que el juego invente retos ilimitados leyendo tus "Estrellitas", ingresa aquí una "API Key" de Google Gemini (Es 100% gratuita buscarla en Google AI Studio).</p>
           <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="AIzaSyA..." className="w-full bg-black/50 border border-pink-500/50 rounded-xl p-4 text-white uppercase text-center tracking-widest font-mono mb-4 outline-none focus:border-pink-500"/>
           <button onClick={saveApi} className="w-full py-4 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-500">Vincular Motor IA</button>
        </div>
      )}

      {(tab === 'citas' || tab === 'preguntas') && <div className="text-center p-12 text-gray-500 glass rounded-3xl">En esta versión el administrador básico está habilitado en base de datos. Módulos secundarios de edición condensados por UI limit.</div>}
    </div>
  );
}

function CouponsView({ token, fetchCounts }) {
  const [coupons, setCoupons] = useState([]);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const res = await axios.get(`${API_URL}/coupons`, { headers: { Authorization: `Bearer ${token}` }});
    setCoupons(res.data);
    fetchCounts();
  };

  const redeem = async (id) => {
    if(!confirm('¿Estás segura que quieres usar este cupón ahora mismo?')) return;
    await axios.put(`${API_URL}/coupons/redeem/${id}`, {}, { headers: { Authorization: `Bearer ${token}` }});
    triggerConfetti();
    load();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center glass p-6 rounded-3xl">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Gift className="text-pink-500"/> Tus Vales de Regalo</h1>
          <p className="text-gray-400 mt-1">Úsalos sabiamente, no tienen retorno.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map(c => {
          const isRedeemed = c.is_redeemed === 1;
          return (
            <div key={c.id} className={`relative overflow-hidden rounded-2xl p-6 border-2 transition-all group ${isRedeemed ? 'bg-white/5 border-white/5' : 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-pink-500/30 hover:-translate-y-1'}`}>
              {isRedeemed && <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center backdrop-blur-[2px]"><div className="bg-red-500/80 px-4 py-2 border-2 border-red-300 font-bold text-white rotate-[-15deg] uppercase">Usado</div></div>}
              <div className="flex justify-between items-start mb-4"><span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase">{c.character || 'Regalo'}</span><Gift className="text-pink-400 opacity-50" size={24}/></div>
              <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{c.title}</h3>
              <p className="text-gray-300 text-sm mb-6 h-12 overflow-hidden">{c.description}</p>
              {!isRedeemed ? (<button onClick={() => redeem(c.id)} className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold transition-colors">Usar Vale Ahora</button>) : (<div className="w-full py-3 rounded-xl bg-white/10 text-gray-500 text-center font-bold text-sm">Usado el {new Date(c.redeemed_at).toLocaleDateString()}</div>)}
            </div>
          );
        })}
        {coupons.length === 0 && <p className="text-gray-500 col-span-3 text-center py-20">No tienes vales activos</p>}
      </div>
    </div>
  );
}

function RecuerdosView({ token }) {
  const [citas, setCitas] = useState([]);
  const [recuerdos, setRecuerdos] = useState([]);
  const [selectedCita, setSelectedCita] = useState('');
  const [titulo, setTitulo] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [foto, setFoto] = useState(null);

  const loadData = async () => {
    const [c, r] = await Promise.all([ axios.get(`${API_URL}/citas`, { headers: { Authorization: `Bearer ${token}` }}), axios.get(`${API_URL}/recuerdos`, { headers: { Authorization: `Bearer ${token}` }}) ]);
    setCitas(c.data); setRecuerdos(r.data);
  };
  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCita || !titulo) return;
    const formData = new FormData();
    formData.append('cita_id', selectedCita); formData.append('titulo', titulo); formData.append('unlock_date', unlockDate);
    if (foto) formData.append('foto', foto);
    await axios.post(`${API_URL}/recuerdos`, formData, { headers: { Authorization: `Bearer ${token}` } });
    setTitulo(''); setFoto(null); setSelectedCita(''); setUnlockDate(''); triggerConfetti(); loadData();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex flex-col items-center glass p-8 rounded-3xl mb-8">
        <Camera className="text-pink-500 w-12 h-12 mb-4 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]"/>
        <h1 className="text-3xl font-bold text-white text-center">Nuestra Cápsula de Recuerdos</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6 sticky top-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Plus size={20} className="text-pink-400" /> Nuevo Recuerdo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select value={selectedCita} onChange={e => setSelectedCita(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none">
                <option value="">Selecciona una cita...</option>
                {citas.map(c => <option key={c.id} value={c.id}>Cita {c.option_type} - {c.fecha_cita}</option>)}
              </select>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none" />
              <div><label className="text-gray-400 text-xs block mb-1">Fecha Desbloqueo (Misterio)</label><input type="date" value={unlockDate} onChange={e => setUnlockDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" /></div>
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center relative overflow-hidden bg-white/5">
                <input type="file" accept="image/*" onChange={e => setFoto(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 z-10"/>
                {foto ? <div className="text-pink-400 font-bold">{foto.name}</div> : <div className="text-gray-500"><Image className="mx-auto" /><p>Click para foto</p></div>}
              </div>
              <button type="submit" disabled={!selectedCita || !titulo} className="w-full py-4 rounded-xl bg-pink-600 text-white font-bold">Guardar</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {recuerdos.map((rec) => {
                const isLocked = rec.unlock_date && new Date(rec.unlock_date) > new Date();
                return (
                  <motion.div key={rec.id} initial={{opacity:0}} animate={{opacity:1}} className="glass rounded-3xl overflow-hidden pb-4 group">
                    {isLocked ? (
                      <div className="h-64 bg-gray-900 flex flex-col items-center justify-center p-6"><Lock size={48} className="text-pink-600 mb-4"/><p className="text-white font-bold">Cápsula Activa</p><p className="text-pink-400 text-sm">Se abrirá: <br/><strong className="text-white">{new Date(rec.unlock_date).toLocaleDateString()}</strong></p></div>
                    ) : (
                      rec.foto ? <div className="h-64 bg-black/50"><img src={getImageUrl(rec.foto)} className="w-full h-full object-cover" onError={e=>e.target.src='https://via.placeholder.com/400'}/></div> : <div className="h-64 flex items-center justify-center"><Heart size={48} className="text-pink-500/20"/></div>
                    )}
                    <div className="px-6 pt-5"><h3 className="text-white font-bold text-lg mb-2">{rec.titulo}</h3><p className="text-gray-500 text-xs flex justify-between">{new Date(rec.created_at).toLocaleDateString()} {isLocked && <span className="bg-pink-500/10 text-pink-500 px-2 rounded">Misterio</span>}</p></div>
                  </motion.div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
}

export default App;
