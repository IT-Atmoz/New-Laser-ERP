const LaserLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">

      {/* Laser cutting animation */}
      <div className="relative w-72 h-48 mb-10">

        {/* Metal sheet / workpiece */}
        <div className="absolute bottom-0 left-0 right-0 h-16 rounded-md"
          style={{ background: "linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}
        />

        {/* Cut line glow on metal */}
        <div className="absolute bottom-8 left-0 right-0 h-0.5 bg-orange-400/30" />

        {/* Laser head - slides left to right */}
        <div
          className="absolute top-0"
          style={{ animation: "laserMove 2s ease-in-out infinite" }}
        >
          {/* Laser head body */}
          <div className="relative flex flex-col items-center">
            {/* Nozzle body */}
            <div className="w-10 h-8 rounded-sm flex items-center justify-center"
              style={{ background: "linear-gradient(180deg, #e2e8f0 0%, #94a3b8 100%)", boxShadow: "0 0 8px rgba(0,0,0,0.2)" }}
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px #22d3ee" }} />
            </div>
            {/* Nozzle tip */}
            <div className="w-0 h-0" style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "10px solid #94a3b8"
            }} />

            {/* Laser beam */}
            <div
              className="w-0.5 rounded-full"
              style={{
                height: "90px",
                background: "linear-gradient(180deg, #ff0000 0%, #ff6600 40%, rgba(255,100,0,0.1) 100%)",
                boxShadow: "0 0 6px #ff4400, 0 0 12px #ff2200, 0 0 20px #ff000066",
                animation: "beamPulse 0.15s ease-in-out infinite alternate",
              }}
            />

            {/* Spark burst at beam tip */}
            <div className="relative w-0 h-0">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <div
                  key={angle}
                  className="absolute w-0.5 rounded-full"
                  style={{
                    height: "6px",
                    background: `hsl(${30 + angle / 10}, 100%, 65%)`,
                    transformOrigin: "0 0",
                    transform: `rotate(${angle}deg) translateY(-3px)`,
                    animation: `sparkFlicker ${0.1 + (angle % 3) * 0.05}s ease-in-out infinite alternate`,
                    boxShadow: "0 0 4px #ffaa00",
                  }}
                />
              ))}
              {/* Core glow dot */}
              <div className="absolute w-3 h-3 rounded-full -translate-x-1.5 -translate-y-1.5"
                style={{ background: "#fff", boxShadow: "0 0 6px #ff8800, 0 0 12px #ff4400, 0 0 20px #ff0000" }}
              />
            </div>
          </div>
        </div>

        {/* Cut trail glow that follows the laser */}
        <div
          className="absolute bottom-8 left-0 h-0.5"
          style={{
            background: "linear-gradient(90deg, transparent, #f97316, #fb923c)",
            boxShadow: "0 0 6px #f97316, 0 0 12px #ea580c",
            animation: "trailExpand 2s ease-in-out infinite",
          }}
        />

        {/* Rails on top */}
        <div className="absolute top-3 left-0 right-0 h-1 rounded-full bg-slate-300" />
      </div>

      {/* Text */}
      <p className="text-cyan-600 text-xl font-bold tracking-widest uppercase mb-2"
        style={{ textShadow: "0 0 10px #67e8f9" }}
      >
        Laser ERP
      </p>
      <p className="text-slate-500 text-sm tracking-widest uppercase"
        style={{ animation: "textFade 1.5s ease-in-out infinite alternate" }}
      >
        Initializing System...
      </p>

      <style>{`
        @keyframes laserMove {
          0%   { left: 0px; }
          50%  { left: calc(288px - 40px); }
          100% { left: 0px; }
        }
        @keyframes beamPulse {
          from { opacity: 0.85; }
          to   { opacity: 1; }
        }
        @keyframes sparkFlicker {
          from { opacity: 0.6; transform: rotate(var(--r, 0deg)) translateY(-3px) scaleY(0.7); }
          to   { opacity: 1;   transform: rotate(var(--r, 0deg)) translateY(-3px) scaleY(1.3); }
        }
        @keyframes trailExpand {
          0%   { width: 0%; }
          50%  { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes textFade {
          from { opacity: 0.4; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LaserLoader;
