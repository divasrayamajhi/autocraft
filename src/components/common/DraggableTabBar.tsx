import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DraggableTabBarProps {
  children: React.ReactNode;
  className?: string;
}

export const DraggableTabBar: React.FC<DraggableTabBarProps> = ({
  children,
  className = ''
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);
    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with primary left mouse button
    if (e.button !== 0 || !scrollRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag speed multiplier
    if (Math.abs(walk) > 4) {
      setHasMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeftState - walk;
    checkScrollability();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Prevent click from activating tab if user dragged
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMoved) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const scrollByAmount = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative flex items-center group ${className}`}>
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-200)}
          className="absolute -left-2 z-10 p-1.5 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition"
          title="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Draggable Tab Area */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        className={`w-full overflow-x-auto select-none no-scrollbar flex items-center space-x-2 pb-2 border-b border-slate-200 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(200)}
          className="absolute -right-2 z-10 p-1.5 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition"
          title="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
