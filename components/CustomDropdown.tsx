"use client";

import { useState, useEffect, useRef } from "react";

export default function CustomDropdown({ options, value, onChange }: { options: any[], value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.id === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 bg-transparent text-[13px] font-semibold text-zinc-700 hover:text-black transition-colors outline-none py-1.5 px-3 rounded-full border border-black/10 hover:bg-black/5">
        {selectedOption.logo ? (
          <img src={selectedOption.logo} alt="" className="w-[14px] h-[14px] object-contain shrink-0" />
        ) : (
          <div className="w-[14px] h-[14px] rounded-full bg-zinc-200 flex justify-center items-center text-[8px] shrink-0">
            {selectedOption.name.charAt(0)}
          </div>
        )}
        <span>{selectedOption.name}</span>
        <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        // 🚀 注意这里：加入了 sm: 响应式前缀，完美解决手机端撑爆屏幕的问题
        <div className="absolute top-full -left-4 sm:left-0 mt-2 w-[calc(100vw-2rem)] sm:w-[360px] rounded-2xl bg-white/95 backdrop-blur-2xl shadow-[0_16px_40px_rgb(0,0,0,0.12)] border border-zinc-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar px-1.5">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left ${value === opt.id ? 'bg-blue-50/50' : 'hover:bg-zinc-50'}`}
              >
                <div className="shrink-0 mt-0.5">
                  {opt.logo ? (
                    <img src={opt.logo} alt="" className="w-6 h-6 object-contain rounded-full bg-white shadow-sm border border-zinc-100" />
                  ) : (
                     <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-200">
                      {opt.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-1 pr-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${value === opt.id ? 'text-blue-700' : 'text-zinc-900'}`}>{opt.name}</span>
                    {opt.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 shrink-0 border border-zinc-200/60">{opt.badge}</span>}
                  </div>
                  {opt.desc && (
                    <p className={`text-[11.5px] leading-relaxed line-clamp-2 ${value === opt.id ? 'text-blue-600/80' : 'text-zinc-500'}`}>
                      {opt.desc}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}