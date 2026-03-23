import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageSquare, ListTodo, BrainCircuit, Database, Sparkles, Send, 
  BookOpen, Trophy, Zap, Clock, AlertCircle, RefreshCw, ChevronRight, User
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const generateUserId = () => '_' + Math.random().toString(36).substr(2, 9);

function App() {
  const [userId, setUserId] = useState('');
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    let id = localStorage.getItem('studyMindUserId');
    if (!id) {
      id = generateUserId();
      localStorage.setItem('studyMindUserId', id);
    }
    setUserId(id);
  }, []);

  if (!userId) return null;

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 font-sans overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-5%] w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Sidebar Focus Area */}
      <div className="w-72 bg-[#0d1323]/80 backdrop-blur-2xl border-r border-white/5 flex flex-col z-10 py-6">
        <div className="px-8 pb-8 flex items-center gap-3 border-b border-white/5">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/30">
             <BrainCircuit size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">StudyMind</h1>
            <p className="text-xs text-indigo-400 font-medium tracking-wide">AI COMPANION</p>
          </div>
        </div>
        
        <div className="px-6 py-6 font-medium text-xs text-slate-500 uppercase tracking-widest">Modules</div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarBtn 
            icon={<MessageSquare size={20} />} 
            label="Chat Tutor" 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            color="indigo"
          />
          <SidebarBtn 
            icon={<ListTodo size={20} />} 
            label="Quiz Master" 
            active={activeTab === 'quiz'} 
            onClick={() => setActiveTab('quiz')} 
            color="rose"
          />
          <SidebarBtn 
            icon={<Trophy size={20} />} 
            label="Study Plan" 
            active={activeTab === 'plan'} 
            onClick={() => setActiveTab('plan')} 
            color="amber"
          />

        </nav>

        <div className="px-6 pb-4">
           <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 group cursor-pointer hover:bg-white/10 transition">
              <div className="bg-slate-800 p-2 rounded-full border border-slate-700">
                  <User size={16} className="text-slate-400 group-hover:text-indigo-400 transition" />
              </div>
              <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-semibold text-slate-200">Session User</div>
                  <div className="text-xs text-slate-500 font-mono truncate">{userId}</div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-auto z-10 relative">
        <div className="max-w-6xl mx-auto h-full px-8 py-8 animate-fade-in">
           {activeTab === 'chat' && <ChatTutor userId={userId} />}
           {activeTab === 'quiz' && <QuizMode userId={userId} />}
           {activeTab === 'plan' && <StudyPlan userId={userId} />}
        </div>
      </div>
    </div>
  );
}

function SidebarBtn({ icon, label, active, onClick, color }) {
  const colorMap = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 shadow-indigo-500/10',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 shadow-rose-500/10',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 shadow-amber-500/10',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 shadow-emerald-500/10'
  };

  const idleMap = 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent';

  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-300 ${
        active ? `${colorMap[color]} shadow-lg` : idleMap
      }`}
    >
      <div className={active ? `scale-110 transition-transform` : ''}>{icon}</div>
      <span className="font-semibold text-sm">{label}</span>
      {active && <ChevronRight size={16} className="ml-auto opacity-50" />}
    </button>
  );
}

// ---- CHAT TUTOR ----

function ChatTutor({ userId }) {
  const [subject, setSubject] = useState('Computer Science');
  const [messages, setMessages] = useState([{ 
    role: 'assistant', 
    content: "Greetings! I'm StudyMind, your personal AI tutor equipped with memory. What shall we master today?" 
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
     if(scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_BASE}/chat`, {
        userId,
        message: `[${subject}] ${userMsg}`
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection failed. Please check the backend log or backend .env file.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0f1526]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      {/* Chat Header */}
      <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-4">
           <div className="bg-indigo-500/20 p-3 rounded-full border border-indigo-500/30 text-indigo-400">
               <MessageSquare size={24} />
           </div>
           <div>
              <h2 className="text-xl font-bold">Interactive Tutoring</h2>
              <p className="text-xs font-medium text-slate-400 flex items-center gap-2 mt-1">
                 <Sparkles size={12} className="text-indigo-400" /> Powered by Hindsight Memory
              </p>
           </div>
        </div>
        <select 
          className="bg-[#1a233a] border border-white/10 rounded-xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-white/5 transition appearance-none cursor-pointer"
          value={subject} 
          onChange={e => setSubject(e.target.value)}
        >
          <option>Mathematics</option>
          <option>Physics</option>
          <option>History & Arts</option>
          <option>Computer Science</option>
        </select>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 mt-auto shadow-md">
                   <BrainCircuit size={16} className="text-white" />
                </div>
            )}
            <div className={`max-w-[75%] px-6 py-4 text-[15px] leading-relaxed relative ${
              m.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-3xl rounded-br-sm shadow-xl shadow-indigo-900/40' 
                : 'bg-[#1a233a] text-slate-200 rounded-3xl rounded-bl-sm shadow-lg border border-white/5'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-center animate-fade-in">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3">
                 <BrainCircuit size={16} className="text-white animate-pulse" />
             </div>
             <div className="px-6 py-4 bg-[#1a233a] text-slate-400 rounded-3xl rounded-bl-sm flex gap-2 border border-white/5">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
             </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-white/[0.02] border-t border-white/5">
          <form onSubmit={sendMessage} className="relative group">
            <input 
              autoFocus
              className="w-full bg-[#1a233a] border border-white/10 rounded-2xl pl-6 pr-16 py-5 focus:ring-2 focus:ring-indigo-500 outline-none text-[15px] transition-all group-hover:border-white/20 shadow-inner"
              placeholder={`Ask a question about ${subject}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-3 top-3 bottom-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 w-12 flex items-center justify-center rounded-xl transition-all shadow-md shadow-indigo-600/30"
            >
              <Send size={18} className="text-white" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-slate-500 flex items-center justify-center gap-2">
             <AlertCircle size={12} /> Interactions are automatically saved to your semantic memory bank.
          </div>
      </div>
    </div>
  );
}


// ---- QUIZ MODE ----

function QuizMode({ userId }) {
  const [subject, setSubject] = useState('Computer Science');
  const [difficulty, setDifficulty] = useState('Medium');
  const [quizState, setQuizState] = useState('setup');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/quiz/generate`, { userId, subject, difficulty });
      if(data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setQuizState('playing');
          setCurrentIdx(0);
          setResults([]);
          setSelectedOption(null);
      } else {
          alert('Failed to generate quiz. Check backend logs.');
      }
    } catch(err) {
      alert('Error generating quiz. Please verify backend GROQ_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (opt) => {
    if (selectedOption) return;
    setSelectedOption(opt);
    const q = questions[currentIdx];
    const isCorrect = opt === q.correct_answer;
    setResults(prev => [...prev, {
      question: q.question, topic: q.topic, correct_answer: q.correct_answer, user_answer: opt, is_correct: isCorrect
    }]);

    setTimeout(() => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
            setSelectedOption(null);
        } else {
            finishQuiz([...results, {
                question: q.question, topic: q.topic, correct_answer: q.correct_answer, user_answer: opt, is_correct: isCorrect
              }]);
        }
    }, 2500);
  };

  const finishQuiz = async (finalResults) => {
    setQuizState('results');
    setLoading(true);
    try {
        const { data } = await axios.post(`${API_BASE}/quiz/submit`, { userId, subject, results: finalResults });
        setScore(data);
    } catch (err) { } finally { setLoading(false); }
  };

  if (quizState === 'setup') {
    return (
      <div className="flex items-center justify-center h-full animate-fade-in">
        <div className="bg-[#0f1526]/80 backdrop-blur-3xl p-12 rounded-[2rem] border border-white/10 shadow-2xl max-w-xl w-full relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-rose-500/10 rounded-full mix-blend-screen filter blur-[50px]"></div>
          
          <div className="flex justify-center mb-8">
             <div className="bg-rose-500/20 p-5 rounded-3xl border border-rose-500/30">
                 <Trophy className="w-12 h-12 text-rose-400" />
             </div>
          </div>

          <h2 className="text-3xl font-extrabold mb-3 text-center text-white">Targeted Assessment</h2>
          <p className="text-center text-slate-400 mb-10 text-sm">We'll scan your memory for weak spots to dynamically generate a challenging test.</p>
          
          <div className="space-y-6 mb-10">
            <div>
                <label className="block text-slate-300 text-sm uppercase tracking-wider font-bold mb-3 pl-1">Knowledge Domain</label>
                <select 
                    className="w-full bg-[#1a233a] border border-white/10 rounded-2xl px-6 py-4 font-medium text-[15px] focus:ring-2 focus:ring-rose-500 appearance-none hover:border-white/20 transition-all outline-none"
                    value={subject} onChange={e => setSubject(e.target.value)}>
                    <option>Mathematics</option>
                    <option>Science</option>
                    <option>Computer Science</option>
                    <option>History</option>
                </select>
            </div>
            <div>
                <label className="block text-slate-300 text-sm uppercase tracking-wider font-bold mb-3 pl-1">Difficulty Level</label>
                <select 
                    className="w-full bg-[#1a233a] border border-white/10 rounded-2xl px-6 py-4 font-medium text-[15px] focus:ring-2 focus:ring-rose-500 appearance-none hover:border-white/20 transition-all outline-none"
                    value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                </select>
            </div>
          </div>

          <button 
            onClick={generateQuiz} disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 disabled:opacity-50 py-5 rounded-2xl font-bold text-lg shadow-[0_10px_40px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-3 group"
          >
            {loading ? (
                <><RefreshCw className="animate-spin" /> Synthesizing Neurons...</>
            ) : (
                <><Zap className="group-hover:scale-110 transition-transform"/> Initialize Simulation</>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'playing') {
    const q = questions[currentIdx];
    return (
        <div className="flex flex-col items-center h-full max-w-4xl mx-auto py-10 animate-fade-in relative z-10 w-full">
             
             <div className="w-full flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-[#1a233a] rounded-full flex items-center justify-center border border-white/10 font-bold text-lg text-rose-400">
                      {currentIdx + 1}
                   </div>
                   <span className="text-slate-500 font-bold tracking-wide">/ {questions.length}</span>
                </div>
                <div className="bg-rose-500/10 text-rose-400 px-5 py-2 rounded-full font-bold text-sm border border-rose-500/20 shadow-inner flex items-center gap-2">
                    <BookOpen size={16} /> {q.topic}
                </div>
             </div>
             
             <div className="w-full bg-[#0f1526]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 shadow-2xl mb-8 relative overflow-hidden">
                 <div className="absolute top-0 w-full h-1 bg-white/5 left-0">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500" style={{width: `${((currentIdx) / questions.length) * 100}%`}}></div>
                 </div>
                 <h2 className="text-2xl lg:text-3xl font-semibold leading-relaxed text-white text-center">{q.question}</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                 {q.options.map((opt, i) => {
                     let btnClass = "bg-[#1a233a] hover:bg-white/10 border-white/10 hover:border-white/30 text-slate-300";
                     if (selectedOption) {
                         if (opt === q.correct_answer) {
                             btnClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.2)] font-bold";
                         } else if (opt === selectedOption) {
                             btnClass = "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.2)] font-bold";
                         } else {
                             btnClass = "bg-[#1a233a] border-white/5 opacity-40";
                         }
                     }
                     
                     return (
                         <button 
                           key={i}
                           onClick={() => handleOptionClick(opt)}
                           disabled={!!selectedOption}
                           className={`p-6 rounded-2xl border text-left text-lg transition-all duration-300 relative overflow-hidden group ${btnClass}`}
                         >
                             <div className="flex gap-4 items-center">
                                 <div className={`w-8 h-8 rounded-full border border-white/20 flex items-center justify-center font-bold text-sm ${selectedOption && opt === q.correct_answer ? 'bg-emerald-500 text-white border-none' : selectedOption && opt === selectedOption ? 'bg-rose-500 text-white border-none' : 'bg-white/5 text-slate-400 group-hover:bg-white/10'}`}>
                                     {['A', 'B', 'C', 'D'][i]}
                                 </div>
                                 <span className="flex-1">{opt}</span>
                             </div>
                         </button>
                     )
                 })}
             </div>
             
             {selectedOption && (
                 <div className="mt-8 p-8 bg-gradient-to-br from-[#1a233a] to-[#0f1526] border border-white/10 rounded-2xl w-full text-slate-300 animate-fade-in shadow-xl relative overflow-hidden">
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                     <h4 className="font-bold text-white flex items-center gap-2 mb-2"><BrainCircuit size={18} className="text-indigo-400" /> AI Breakdown</h4>
                     <p className="leading-relaxed">{q.explanation}</p>
                 </div>
             )}
        </div>
    )
  }

  return (
      <div className="flex items-center justify-center h-full animate-fade-in">
        <div className="bg-[#0f1526]/80 backdrop-blur-3xl p-14 rounded-[2rem] border border-white/10 shadow-2xl max-w-xl w-full text-center relative overflow-hidden">
          
          <div className="text-7xl mb-8 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              {score.correct >= score.wrong ? '🏆' : '📚'}
          </div>
          <h2 className="text-4xl font-extrabold mb-3 text-white">Simulation Complete</h2>
          <p className="text-slate-400 mb-10 text-[15px]">Results synthesized and recorded in semantic memory bank.</p>
          
          <div className="flex justify-center gap-6 mb-12">
              <div className="flex-1 bg-gradient-to-b from-emerald-500/20 to-emerald-900/10 border border-emerald-500/20 rounded-3xl p-6">
                  <div className="text-5xl font-black text-emerald-400 mb-2 drop-shadow-md">{score.correct}</div>
                  <div className="text-emerald-500/70 font-bold text-xs tracking-widest uppercase">Answers</div>
              </div>
              <div className="flex-1 bg-gradient-to-b from-rose-500/20 to-rose-900/10 border border-rose-500/20 rounded-3xl p-6">
                  <div className="text-5xl font-black text-rose-400 mb-2 drop-shadow-md">{score.wrong}</div>
                  <div className="text-rose-500/70 font-bold text-xs tracking-widest uppercase">Answers</div>
              </div>
          </div>
          
          <button 
             onClick={() => setQuizState('setup')}
             className="bg-[#1a233a] hover:bg-white/10 border border-white/10 py-5 w-full rounded-2xl font-bold transition-all text-slate-200"
          >
             Initiate Another Test
          </button>
        </div>
      </div>
  )
}


// ---- STUDY PLAN ----

function StudyPlan({ userId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/study-plan/${userId}`);
      if(data.plan) setPlan(data.plan);
      else alert('No valid plan returned.');
    } catch(err) {
      alert('Error fetching plan. Ensure backend is running and keys are valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-start">
      <div className="flex justify-between items-center bg-[#0f1526]/80 p-8 rounded-3xl border border-white/5 mb-8 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-5">
             <div className="bg-amber-500/20 p-4 rounded-2xl border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                 <Trophy size={32} />
             </div>
             <div>
                <h2 className="text-3xl font-extrabold text-white">Strategic Roadmap</h2>
                <p className="text-slate-400 mt-1 font-medium">A 7-day optimized blueprint derived from memory reflections.</p>
             </div>
          </div>
          <button 
             onClick={generatePlan} disabled={loading}
             className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 px-8 py-4 rounded-2xl font-bold shadow-[0_10px_30px_rgba(245,158,11,0.3)] transition-all flex items-center gap-3 text-white"
          >
             {loading ? <RefreshCw className="animate-spin" /> : <BrainCircuit />}
             {plan ? 'Re-sythesize Plan' : 'Generate Roadmap'}
          </button>
      </div>

      {!plan && !loading && (
          <div className="flex-1 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-slate-500 bg-white/[0.01]">
              <Database size={48} className="mb-4 text-slate-700" />
              <p className="text-xl font-medium">No active plan detected.</p>
              <p className="text-sm mt-2">Initialize extraction to build your study curriculum.</p>
          </div>
      )}

      {loading && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {[1,2,3,4,5,6,7].map(i => (
                  <div key={i} className="bg-[#1a233a]/50 p-8 rounded-3xl border border-white/5 animate-pulse h-64"></div>
               ))}
           </div>
      )}

      {plan && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12 animate-fade-in custom-scrollbar">
          {plan.map((day, idx) => (
            <div key={idx} className="bg-[#0f1526]/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl hover:-translate-y-2 hover:border-amber-500/50 hover:shadow-[0_20px_40px_rgba(245,158,11,0.1)] transition-all duration-300 flex flex-col relative overflow-hidden group">
              
              {/* Highlight bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex justify-between items-start mb-5">
                  <div className="bg-white/5 text-amber-400 px-4 py-1.5 rounded-xl text-xs font-black border border-white/5 tracking-widest uppercase">
                      Day {day.day}
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                      day.priority === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 
                      day.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                  }`}>
                      {day.priority}
                  </span>
              </div>
              
              <h3 className="text-xl font-black mb-2 text-white leading-tight">{day.subject}</h3>
              <p className="text-slate-400 text-sm mb-5 flex-1">{day.reason}</p>
              
              <div className="flex gap-2 mb-6 flex-wrap">
                  {day.topics.map((t, i) => (
                      <span key={i} className="bg-[#1a233a] text-amber-100/70 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/5 whitespace-nowrap">
                         {t}
                      </span>
                  ))}
              </div>
              
              <div className="flex justify-between items-center text-sm font-bold border-t border-white/5 pt-4 mt-auto">
                  <span className="text-slate-500 flex items-center gap-2"><Clock size={16}/> Allocation</span>
                  <span className="text-amber-400">{day.duration} min</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




export default App;
