"use client";
import React from "react";

// Lightweight draggable + resizable floating window
// - Drag via header
// - Resize via right, bottom, and bottom-right handles
// - Minimize / Maximize / Restore controls
// - No overlay; does not block the rest of the UI
export default function FloatingWindow({
  open = true,
  onOpenChange,
  title = "",
  children,
  initialRect = { x: 240, y: 80, w: 720, h: 520 },
  className = "",
}) {
  const [visible, setVisible] = React.useState(open);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [rect, setRect] = React.useState(initialRect);
  const prevRectRef = React.useRef(initialRect);

  React.useEffect(() => setVisible(open), [open]);
  React.useEffect(() => {
    if (onOpenChange) onOpenChange(visible);
  }, [visible, onOpenChange]);

  const onDragStart = (e) => {
    if (isMaximized) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startRect = { ...rect };

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setRect((r) => ({ ...r, x: startRect.x + dx, y: startRect.y + dy }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onResizeStart = (e, edge) => {
    if (isMaximized) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRect = { ...rect };

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setRect((r) => {
        let { x, y, w, h } = startRect;
        const minW = 360;
        const minH = 200;
        if (edge === "right" || edge === "corner") w = Math.max(minW, startRect.w + dx);
        if (edge === "bottom" || edge === "corner") h = Math.max(minH, startRect.h + dy);
        return { x, y, w, h };
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsMaximized(false);
  };
  const handleMaximize = () => {
    if (!isMaximized) prevRectRef.current = rect;
    setIsMaximized(true);
    setIsMinimized(false);
  };
  const handleRestore = () => {
    setIsMaximized(false);
    setIsMinimized(false);
    setRect(prevRectRef.current);
  };
  const handleClose = () => setVisible(false);

  if (!visible) return null;

  const style = isMaximized
    ? { top: 0, left: 0, width: "100vw", height: "100vh" }
    : { top: rect.y, left: rect.x, width: rect.w, height: isMinimized ? 44 : rect.h };

  return (
    <div
      className={`fixed z-[60] shadow-xl border rounded-md bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
      style={style}
      role="dialog"
      aria-modal="false"
      data-floating-window="true"
    >
      <div
        className="cursor-move flex items-center justify-between px-3 py-2 border-b bg-muted/60"
        onMouseDown={onDragStart}
      >
        <div className="font-medium truncate pr-2 select-none">{title}</div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <button className="size-7 grid place-items-center hover:bg-accent rounded" title="Minimize" onClick={handleMinimize}>
              <span className="text-xs">_</span>
            </button>
          )}
          {isMaximized ? (
            <button className="size-7 grid place-items-center hover:bg-accent rounded" title="Restore" onClick={handleRestore}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M7 7h10v10H7z"/></svg>
            </button>
          ) : (
            <button className="size-7 grid place-items-center hover:bg-accent rounded" title="Maximize" onClick={handleMaximize}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>
            </button>
          )}
          {isMinimized && (
            <button className="size-7 grid place-items-center hover:bg-accent rounded" title="Restore" onClick={handleRestore}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M7 7h10v10H7z"/></svg>
            </button>
          )}
          <button className="size-7 grid place-items-center hover:bg-destructive/10 text-destructive rounded" title="Close" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M18.3 5.71L12 12.01l-6.3-6.3-1.42 1.42 6.3 6.3-6.3 6.3 1.42 1.42 6.3-6.3 6.3 6.3 1.42-1.42-6.3-6.3 6.3-6.3z"/></svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="h-[calc(100%-44px)] overflow-hidden">
          {children}
        </div>
      )}

      {/* Resize handles */}
      {!isMaximized && !isMinimized && (
        <>
          <div className="absolute right-0 top-0 h-full w-1 cursor-ew-resize" onMouseDown={(e) => onResizeStart(e, "right")} />
          <div className="absolute left-0 bottom-0 h-1 w-full cursor-ns-resize" onMouseDown={(e) => onResizeStart(e, "bottom")} />
          <div className="absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize" onMouseDown={(e) => onResizeStart(e, "corner")} />
        </>
      )}
    </div>
  );
}

