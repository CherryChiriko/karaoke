export const CornerFrame = () => (
  <>
    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/60 pointer-events-none" />
    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/60 pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/60 pointer-events-none" />
    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/60 pointer-events-none" />
  </>
);