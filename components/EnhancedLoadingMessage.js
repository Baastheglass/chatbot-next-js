import React, { useState, useEffect } from 'react';

const EnhancedLoadingMessage = () => {
  const [particles, setParticles] = useState([]);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingDots, setLoadingDots] = useState('');
  
  const stages = [
    { text: 'Analyzing your request', icon: '🔍', color: 'from-blue-400 to-cyan-400' },
    { text: 'Accessing knowledge base', icon: '📚', color: 'from-purple-400 to-pink-400' },
    { text: 'Generating insights', icon: '💡', color: 'from-yellow-400 to-orange-400' },
    { text: 'Crafting response', icon: '✨', color: 'from-green-400 to-emerald-400' }
  ];
  
  // Create floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2000,
      duration: 3000 + Math.random() * 2000
    }));
    setParticles(newParticles);
  }, []);
  
  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  // Stage progression
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStage(prev => (prev + 1) % stages.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  const currentStage = stages[loadingStage];
  
  return (
    <div className="flex items-start space-x-3 mb-4 animate-fadeIn">
      <div className="relative w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-spin-slow"></div>
        
        {/* Icon with rotation */}
        <span className="relative text-lg animate-float z-10">
          {currentStage.icon}
        </span>
        
        {/* Particles */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-ping"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}ms`,
              animationDuration: `${particle.duration}ms`
            }}
          />
        ))}
      </div>
      
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl p-5 max-w-[80%] border border-slate-600/50 shadow-xl relative overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Stage indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm font-semibold bg-gradient-to-r ${currentStage.color} bg-clip-text text-transparent`}>
              {currentStage.text}
            </div>
            <div className="flex space-x-1">
              {stages.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                    index <= loadingStage 
                      ? 'bg-gradient-to-r from-blue-400 to-purple-400' 
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Animated thinking bubbles */}
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
            
            {/* Neural network visualization */}
            <div className="flex-1 h-8 relative">
              <svg className="w-full h-full opacity-30" viewBox="0 0 100 20">
                {/* Animated connections */}
                <path
                  d="M10,10 Q30,5 50,10 T90,10"
                  stroke="url(#gradient)"
                  strokeWidth="1"
                  fill="none"
                  className="animate-pulse"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                
                {/* Nodes */}
                {[20, 40, 60, 80].map((x, i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy="10"
                    r="2"
                    fill="#3b82f6"
                    className="animate-pulse"
                    style={{ animationDelay: `${i * 300}ms` }}
                  />
                ))}
              </svg>
            </div>
          </div>
          
          {/* Progress bar with segments */}
          <div className="mt-4 space-y-2">
            <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${currentStage.color} rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${((loadingStage + 1) / stages.length) * 100}%` }}
              />
            </div>
            
            {/* Processing indicator */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span>Processing</span>
                <span className="min-w-[20px] text-left">{loadingDots}</span>
              </div>
              <span>{Math.round(((loadingStage + 1) / stages.length) * 100)}%</span>
            </div>
          </div>
          
          {/* Typing indicator */}
          <div className="mt-3 flex items-center space-x-2 text-xs text-slate-500">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-slate-500 rounded-full animate-typing" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-slate-500 rounded-full animate-typing" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1 h-1 bg-slate-500 rounded-full animate-typing" style={{ animationDelay: '400ms' }}></div>
            </div>
            <span>AI is typing...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLoadingMessage;
