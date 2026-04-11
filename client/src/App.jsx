import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Shuffle, Hand, Image, Calendar, Clock, 
  Save, Eye, LogOut, User, Sparkles, Camera,
  ChevronLeft, ChevronRight, Plus, X
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [showLogin, setShowLogin] = useState(!token);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('game');

  const login = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      setToken(res.data.token);
      setRole(res.data.role);
      setShowLogin(false);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setShowLogin(true);
  };

  if (showLogin || !token) {
    return <Login onLogin={login} username={username} setUsername={setUsername} password={password} setPassword={setPassword} error={error} />;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} role={role} logout={logout} />
      <main className="flex-1 p-8">
        {role === 'admin' && currentView === 'admin' && <AdminPanel token={token} />}
        {currentView === 'game' && <GameView token={token} />}
        {currentView === 'citas' && <CitasView token={token} />}
        {currentView === 'recuerdos' && <RecuerdosView token={token} />}
      </main>
    </div>
  );
}

function Login({ onLogin, username, setUsername, password, setPassword, error }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 mb-4"
          >
            <Heart className="w-10 h-10 text-white" fill="currentColor" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">Línea de tiempo</h1>
          <p className="text-[10px] text-pink-400 mt-1">con amor para Andrea Leon</p>
          <p className="text-gray-400 mt-2">Inicia sesión para continuar</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500"
          />
          <button
            onClick={onLogin}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Iniciar Sesión
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Admin: admin / admin123<br/>
          Usuario: user / admin123
        </p>
      </motion.div>
    </div>
  );
}

function Sidebar({ currentView, setCurrentView, role, logout }) {
  const isAdmin = role === 'admin';
  
  return (
    <aside className="w-64 glass min-h-screen p-4 flex flex-col">
      <div className="text-center py-6 border-b border-white/10 mb-6">
        <Heart className="w-10 h-10 text-pink-500 mx-auto mb-2" fill="currentColor" />
        <h2 className="text-white font-bold text-xl">Línea de tiempo</h2>
        <p className="text-[9px] text-pink-400">con amor para Andrea Leon</p>
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarBtn icon={Sparkles} label="Juego" active={currentView === 'game'} onClick={() => setCurrentView('game')} />
        <SidebarBtn icon={Calendar} label="Citas" active={currentView === 'citas'} onClick={() => setCurrentView('citas')} />
        <SidebarBtn icon={Image} label="Recuerdos" active={currentView === 'recuerdos'} onClick={() => setCurrentView('recuerdos')} />
        {isAdmin && <SidebarBtn icon={User} label="Admin" active={currentView === 'admin'} onClick={() => setCurrentView('admin')} />}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
      >
        <LogOut size={20} />
        <span>Salir</span>
      </button>
    </aside>
  );
}

function SidebarBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/30' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

function AdminPanel({ token }) {
  const [options, setOptions] = useState({ A: {}, B: {}, C: {} });
  const [saved, setSaved] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [allOptions, setAllOptions] = useState([]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    const res = await axios.get(`${API_URL}/options`, { headers: { Authorization: `Bearer ${token}` }});
    const opts = { A: {}, B: {}, C: {} };
    res.data.forEach(o => { opts[o.option_type] = o; });
    setOptions(opts);
  };

  const handleSave = async (type) => {
    await axios.post(`${API_URL}/options`, options[type], { headers: { Authorization: `Bearer ${token}` }});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleViewAll = async () => {
    const res = await axios.get(`${API_URL}/options`, { headers: { Authorization: `Bearer ${token}` }});
    setAllOptions(res.data);
    setViewAll(true);
  };

  return (
    <div className="space-y-6">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
        <p className="text-gray-400">Configura tu Línea de tiempo</p>
      </header>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleViewAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
        >
          <Eye size={18} /> Ver todos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['A', 'B', 'C'].map(type => (
          <OptionCard 
            key={type}
            type={type}
            option={options[type]}
            onChange={(field, value) => setOptions(prev => ({ ...prev, [type]: { ...prev[type], option_type: type, [field]: value } }))}
            onSave={() => handleSave(type)}
            saved={saved}
          />
        ))}
      </div>

      <AnimatePresence>
        {viewAll && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setViewAll(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Todas las Opciones</h2>
                <button onClick={() => setViewAll(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              {allOptions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay opciones guardadas</p>
              ) : (
                <div className="space-y-4">
                  {allOptions.map(opt => (
                    <div key={opt.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 font-bold">
                          Opción {opt.option_type}
                        </span>
                      </div>
                      <p className="text-white mb-1"><strong>URL:</strong> {opt.url}</p>
                      <p className="text-gray-300 mb-1"><strong>Dedicatoria:</strong> {opt.dedicatoria || '-'}</p>
                      <p className="text-gray-400 text-sm"><strong>Invitación:</strong> {opt.fecha_invitacion} | <strong>Cita:</strong> {opt.fecha_cita}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptionCard({ type, option, onChange, onSave, saved }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
          {type}
        </span>
        <h3 className="text-xl font-bold text-white">Opción {type}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm block mb-2">URL</label>
          <input
            type="text"
            value={option.url || ''}
            onChange={(e) => onChange('url', e.target.value)}
            placeholder="https://ejemplo.com"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-2">Dedicatoria / Sugerencia</label>
          <textarea
            value={option.dedicatoria || ''}
            onChange={(e) => onChange('dedicatoria', e.target.value)}
            placeholder="Escribe una dedicatoria especial..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Fecha Invitación</label>
            <input
              type="date"
              value={option.fecha_invitacion || ''}
              onChange={(e) => onChange('fecha_invitacion', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">Fecha Cita</label>
            <input
              type="date"
              value={option.fecha_cita || ''}
              onChange={(e) => onChange('fecha_cita', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        <button
          onClick={onSave}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90'
          }`}
        >
          {saved ? <><Sparkles size={18} /> Guardado!</> : <><Save size={18} /> Guardar</>}
        </button>
      </div>
    </motion.div>
  );
}

function GameView({ token }) {
  const [options, setOptions] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [gameState, setGameState] = useState('prompt');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    const res = await axios.get(`${API_URL}/options`, { headers: { Authorization: `Bearer ${token}` }});
    setOptions(res.data);
  };

  const startRandomFlow = () => {
    setGameState('countdown');
    setCountdown(3);
  };

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState('ready_random');
      }
    }
  }, [gameState, countdown]);

  const selectRandom = () => {
    if (options.length === 0) return;
    const random = options[Math.floor(Math.random() * options.length)];
    setSelectedCard(random);
    setGameState('revealed');
    assignOption(random);
  };

  const assignOption = async (option) => {
    await axios.post(`${API_URL}/assign-option`, option, { headers: { Authorization: `Bearer ${token}` }});
  };

  const selectManual = (option) => {
    setSelectedCard(option);
    setGameState('revealed');
    assignOption(option);
  };

  const reset = () => {
    setSelectedCard(null);
    setGameState('prompt');
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-bold text-white mb-2"
        >
          Elige tu Sorpresa
        </motion.h1>
        <p className="text-gray-400">Descubre qué aventura te espera</p>
      </header>

      {gameState === 'prompt' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-12 glass rounded-3xl max-w-md mx-auto"
        >
          <h2 className="text-3xl font-bold text-white mb-8 text-center uppercase">¿Quieres Empezar?</h2>
          <button
            onClick={() => setGameState('choose_mode')}
            className="px-16 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-2xl hover:scale-105 transition-transform"
          >
            SI
          </button>
        </motion.div>
      )}

      {gameState === 'choose_mode' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-12 glass rounded-3xl max-w-lg mx-auto"
        >
          <h2 className="text-2xl font-bold text-white mb-8 text-center uppercase">Escoge como quieres jugar</h2>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              onClick={startRandomFlow}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:scale-105 transition-transform"
            >
              <Shuffle size={24} /> AL AZAR
            </button>
            <button
              onClick={() => setGameState('playing_manual')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all hover:scale-105 border border-white/20"
            >
              <Hand size={24} /> MANUALMENTE
            </button>
          </div>
        </motion.div>
      )}

      {gameState === 'countdown' && (
        <motion.div 
          key={countdown}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <span className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 drop-shadow-2xl">
            {countdown}
          </span>
        </motion.div>
      )}

      {gameState === 'ready_random' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12 glass rounded-3xl max-w-xl mx-auto text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-8 uppercase">OK, PRESIONA MEZCLAR PARA VER AL AZAR TU SELECCION</h2>
          <button
            onClick={selectRandom}
            className="flex items-center gap-2 px-10 py-5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-2xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(236,72,153,0.5)]"
          >
            <Shuffle size={28} /> MEZCLAR
          </button>
        </motion.div>
      )}

      {gameState === 'playing_manual' && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="mt-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white uppercase">Selecciona tu tarjeta</h2>
            <p className="text-gray-400">Elige con cuidado la opción que prefieras</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {options.map((opt, i) => (
              <motion.button
                key={opt.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => selectManual(opt)}
                className="card-3d h-80 w-full group"
              >
                <div className="card-inner w-full h-full relative cursor-pointer">
                  <div className="card-front absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-900 to-pink-900 border border-white/10 flex items-center justify-center group-hover:border-pink-500/50 transition-all">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-pink-500/20 transition-all">
                        <span className="text-5xl font-bold text-pink-400">{opt.option_type}</span>
                      </div>
                      <p className="text-gray-300 font-medium">Toca para elegir</p>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {gameState === 'revealed' && selectedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto"
          >
            <div className="glass rounded-3xl p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-purple-600" />
              <button 
                onClick={reset}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                title="Volver a empezar"
              >
                 <X size={24} />
              </button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)]"
              >
                <Sparkles className="w-12 h-12 text-white" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-2">¡Felicidades!</h2>
              <p className="text-pink-400 font-medium mb-6">Has seleccionado la Opción {selectedCard.option_type}</p>
              
              <div className="space-y-4 text-left">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <p className="text-gray-400 text-sm mb-2 flex items-center gap-2"><Sparkles size={16}/> Enlace Especial</p>
                  <a 
                    href={selectedCard.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:text-pink-300 hover:underline break-all font-medium"
                  >
                    {selectedCard.url}
                  </a>
                </div>
                
                {selectedCard.dedicatoria && (
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <p className="text-gray-400 text-sm mb-2 flex items-center gap-2"><Heart size={16}/> Dedicatoria</p>
                    <p className="text-white italic leading-relaxed">"{selectedCard.dedicatoria}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <p className="text-gray-400 text-sm mb-2">Fecha Invitación</p>
                    <p className="text-white flex items-center gap-2 font-medium">
                      <Calendar size={18} className="text-pink-400" /> 
                      {selectedCard.fecha_invitacion ? new Date(selectedCard.fecha_invitacion).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <p className="text-gray-400 text-sm mb-2">Fecha de Cita</p>
                    <p className="text-white flex items-center gap-2 font-medium">
                      <Clock size={18} className="text-pink-400" /> 
                      {selectedCard.fecha_cita ? new Date(selectedCard.fecha_cita).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={reset}
                className="mt-8 px-8 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors w-full border border-white/10"
              >
                Volver al Menú
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CitasView({ token }) {
  const [citas, setCitas] = useState([]);

  useEffect(() => {
    loadCitas();
  }, []);

  const loadCitas = async () => {
    const res = await axios.get(`${API_URL}/citas`, { headers: { Authorization: `Bearer ${token}` }});
    setCitas(res.data);
  };

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-white">Mis Citas</h1>
        <p className="text-gray-400">Todas las citas guardadas</p>
      </header>

      {citas.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">No hay citas guardadas</p>
          <p className="text-gray-600 text-sm">Juega para guardar una cita</p>
        </div>
      ) : (
        <div className="space-y-4">
          {citas.map((cita, i) => (
            <motion.div
              key={cita.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 flex items-center gap-6"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {cita.option_type}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <a href={cita.url} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                    {cita.url}
                  </a>
                </div>
                {cita.dedicatoria && (
                  <p className="text-gray-300 italic mb-2">"{cita.dedicatoria}"</p>
                )}
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Calendar size={14} /> Invitación: {cita.fecha_invitacion || '-'}
                  </span>
                  <span className="text-pink-400 flex items-center gap-1">
                    <Clock size={14} /> Cita: {cita.fecha_cita || '-'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecuerdosView({ token }) {
  const [citas, setCitas] = useState([]);
  const [recuerdos, setRecuerdos] = useState([]);
  const [selectedCita, setSelectedCita] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [foto, setFoto] = useState(null);

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = API_URL === '/api' ? `http://${window.location.hostname}:3001` : API_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [citasRes, recuerdosRes] = await Promise.all([
      axios.get(`${API_URL}/citas`, { headers: { Authorization: `Bearer ${token}` }}),
      axios.get(`${API_URL}/recuerdos`, { headers: { Authorization: `Bearer ${token}` }})
    ]);
    setCitas(citasRes.data);
    setRecuerdos(recuerdosRes.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCita || !titulo) return;

    const formData = new FormData();
    formData.append('cita_id', selectedCita);
    formData.append('titulo', titulo);
    if (foto) formData.append('foto', foto);

    await axios.post(`${API_URL}/recuerdos`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setTitulo('');
    setFoto(null);
    setSelectedCita(null);
    loadData();
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-white">Recuerdos Obligados</h1>
        <p className="text-gray-400">Guarda los momentos especiales de cada cita</p>
      </header>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Plus size={20} className="text-pink-400" /> Nuevo Recuerdo
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Selecciona la Cita</label>
            <select
              value={selectedCita || ''}
              onChange={(e) => setSelectedCita(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-pink-500"
            >
              <option value="">Selecciona una cita...</option>
              {citas.map(cita => (
                <option key={cita.id} value={cita.id}>
                  Cita {cita.option_type} - {cita.fecha_cita || 'Sin fecha'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">¿Cómo llamarías a esta cita?</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Nuestra primera cena especial..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Subir Foto</label>
            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-pink-500/50 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFoto(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {foto ? (
                <div className="flex items-center justify-center gap-2 text-pink-400">
                  <Camera size={24} />
                  <span>{foto.name}</span>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Camera className="mx-auto mb-2" size={32} />
                  <p>Click para subir una foto</p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedCita || !titulo}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold disabled:opacity-50 hover:opacity-90"
          >
            Guardar Recuerdo
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Timeline de Recuerdos</h2>
        {recuerdos.length === 0 ? (
          <div className="text-center py-12 glass rounded-2xl">
            <Image className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No hay recuerdos todavía</p>
          </div>
        ) : (
          <div className="timeline-scroll">
            {recuerdos.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex-shrink-0 w-72"
              >
                <div className="glass rounded-2xl overflow-hidden">
                  {rec.foto && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={getImageUrl(rec.foto)} 
                        alt={rec.titulo}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x300?text=Imagen+Rota'; }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-2">{rec.titulo}</h3>
                    <p className="text-gray-500 text-xs">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
