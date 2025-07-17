import React, { useState, useEffect } from 'react';

const SimpleLoadingMessage = () => {
  const [dots, setDots] = useState('');
  const [stage, setStage] = useState(0);
  
  const stages = [
    { text: 'Thinking', icon: '🤔' },
    { text: 'Processing', icon: '⚡' },
    { text: 'Generating', icon: '✨' },
    { text: 'Finalizing', icon: '🎯' }
  ];

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Stage progression
  useEffect(() => {
    const interval = setInterval(() => {
      setStage(prev => (prev + 1) % stages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const currentStage = stages[stage];

  return (
    <div className="flex items-start space-x-3 mb-4 animate-fadeIn">
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
        <span className="text-sm">{currentStage.icon}</span>
      </div>
      
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 max-w-[80%] border border-slate-700/50 shadow-lg">
        <div className="flex items-center space-x-3">
          {/* Simple bouncing dots */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-300">
              {currentStage.text}
            </span>
            <span className="text-slate-400 min-w-[20px] text-left">
              {dots}
            </span>
          </div>
        </div>
        
        {/* Simple progress bar */}
        <div className="mt-3 w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoadingMessage;
