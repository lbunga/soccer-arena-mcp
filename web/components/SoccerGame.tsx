"use client";
import { useState, useRef, useEffect } from "react";
import { Button, Card } from "@/components/ui";

export function SoccerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Robot Goalie states and refs for Option B: Tailwind Components
  const [robotState, setRobotState] = useState<"default" | "save" | "miss">("default");
  const robotStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const goalieDivRef = useRef<HTMLDivElement>(null);

  const triggerRobotState = (newState: "save" | "miss") => {
    if (robotStateTimeoutRef.current) {
      clearTimeout(robotStateTimeoutRef.current);
    }
    setRobotState(newState);
    robotStateTimeoutRef.current = setTimeout(() => {
      setRobotState("default");
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (robotStateTimeoutRef.current) {
        clearTimeout(robotStateTimeoutRef.current);
      }
    };
  }, []);

  // Mutable game state ref to avoid React re-render lags in canvas loop
  const gameRef = useRef({
    goalieX: 400,
    goalieWidth: 90,
    goalieSpeed: 8,
    keys: { ArrowLeft: false, ArrowRight: false },
    balls: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      rotation: number;
      rotSpeed: number;
    }>,
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      life: number;
    }>,
    flashRed: 0, // duration of hit flash
    lastSpawn: 0,
    spawnInterval: 2000,
    score: 0,
    lives: 3,
    highScore: 0,
    canvasWidth: 800,
    canvasHeight: 500,
  });

  // Sound generator
  const playSound = (type: "save" | "miss" | "gameover") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "save") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "miss") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "gameover") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc.start();
        osc.stop(ctx.currentTime + 0.7);
      }
    } catch (e) {
      // Ignore web audio support issues
    }
  };

  const startGame = () => {
    gameRef.current.score = 0;
    gameRef.current.lives = 3;
    gameRef.current.balls = [];
    gameRef.current.particles = [];
    gameRef.current.goalieX = 400;
    gameRef.current.spawnInterval = 2000;
    setScore(0);
    setLives(3);
    setGameState("playing");
    playSound("save");
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        gameRef.current.keys[e.key] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        gameRef.current.keys[e.key] = false;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Main canvas game loop
  useEffect(() => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const goalieY = 90;

    const loop = (timestamp: number) => {
      const state = gameRef.current;

      // --- 1. Goalkeeper keyboard movement ---
      if (state.keys.ArrowLeft) {
        state.goalieX = Math.max(160, state.goalieX - state.goalieSpeed);
      }
      if (state.keys.ArrowRight) {
        state.goalieX = Math.min(640, state.goalieX + state.goalieSpeed);
      }

      // Sync goalie React overlay position
      if (goalieDivRef.current) {
        goalieDivRef.current.style.left = `${(state.goalieX / 800) * 100}%`;
      }

      // --- 2. Spawn balls ---
      if (timestamp - state.lastSpawn > state.spawnInterval) {
        const speedMultiplier = 1 + state.score * 0.03; // speed scales slower with score
        const vx = (Math.random() - 0.5) * 5; // random horizontal angle (narrowed slightly)
        const vy = -(3.0 + Math.random() * 3.0) * speedMultiplier; // gentler upward velocity
        state.balls.push({
          x: 400,
          y: 450,
          vx: vx,
          vy: vy,
          radius: 16,
          rotation: 0,
          rotSpeed: (Math.random() - 0.5) * 0.1,
        });
        state.lastSpawn = timestamp;
        // spawn interval gets shorter (min 1000ms)
        state.spawnInterval = Math.max(1000, 2200 - state.score * 60);
      }

      // --- 3. Update balls & Check collisions ---
      for (let i = state.balls.length - 1; i >= 0; i--) {
        const ball = state.balls[i];
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.rotation += ball.rotSpeed;

        // Check catch collision
        if (
          Math.abs(ball.y - goalieY) <= 15 && 
          Math.abs(ball.x - state.goalieX) <= state.goalieWidth / 2 + ball.radius
        ) {
          // Successful Save!
          state.score += 1;
          setScore(state.score);
          playSound("save");
          triggerRobotState("save");

          // Spawn particle effects
          for (let p = 0; p < 15; p++) {
            state.particles.push({
              x: ball.x,
              y: ball.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6 - 2,
              color: `hsl(${120 + Math.random() * 40}, 100%, 50%)`, // green sparkles
              size: 2 + Math.random() * 3,
              life: 30 + Math.random() * 20,
            });
          }
          state.balls.splice(i, 1);
          continue;
        }

        // Check if ball went in the goal
        if (ball.y < 70) {
          if (ball.x >= 120 && ball.x <= 680) {
            // GOAL! (Missed catch)
            state.lives -= 1;
            setLives(state.lives);
            playSound("miss");
            triggerRobotState("miss");
            state.flashRed = 15; // flash red overlay for 15 frames

            // Spawn sad gray particles
            for (let p = 0; p < 10; p++) {
              state.particles.push({
                x: ball.x,
                y: ball.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: "#ef4444", // red sparks
                size: 3 + Math.random() * 3,
                life: 25,
              });
            }

            if (state.lives <= 0) {
              setGameState("gameover");
              playSound("gameover");
              if (state.score > state.highScore) {
                state.highScore = state.score;
                setHighScore(state.score);
              }
            }
          }
          state.balls.splice(i, 1);
        }
      }

      // --- 4. Update particles ---
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.life -= 1;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        }
      }

      // --- 5. RENDER DRAWING ---
      ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

      // A. Draw Field (Striped Green Grass)
      const numStripes = 10;
      const stripeHeight = state.canvasHeight / numStripes;
      for (let s = 0; s < numStripes; s++) {
        ctx.fillStyle = s % 2 === 0 ? "#15803d" : "#166534"; // alternate dark/light green
        ctx.fillRect(0, s * stripeHeight, state.canvasWidth, stripeHeight);
      }

      // White boundary lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, state.canvasWidth - 80, state.canvasHeight - 80);
      
      // Penalty Area Box
      ctx.strokeRect(150, state.canvasHeight - 150, 500, 110);
      // Goal Box
      ctx.strokeRect(260, 40, 280, 80);
      // Penalty Spot
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(400, 450, 6, 0, Math.PI * 2);
      ctx.fill();

      // B. Draw Goal Net at the Top
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1.5;
      // Net diagonals
      const goalLeft = 120;
      const goalRight = 680;
      const goalTop = 30;
      const goalBottom = 70;
      
      ctx.beginPath();
      for (let x = goalLeft; x <= goalRight; x += 15) {
        ctx.moveTo(x, goalBottom);
        ctx.lineTo(x - 10, goalTop);
      }
      for (let y = goalTop; y <= goalBottom; y += 10) {
        ctx.moveTo(goalLeft, y);
        ctx.lineTo(goalRight, y);
      }
      ctx.stroke();

      // Goal post bars
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      // C. Draw Balls
      state.balls.forEach((ball) => {
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.rotation);

        // Ball shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        // Draw classic white ball
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw classic pentagon patterns
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius * 0.35, 0, Math.PI * 2); // center ring
        ctx.fill();

        for (let a = 0; a < 5; a++) {
          const angle = (a * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * ball.radius, Math.sin(angle) * ball.radius);
          ctx.stroke();
        }
        ctx.restore();
      });

      // D. Draw Particles
      state.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // E. Goalkeeper is rendered as a React HTML/Tailwind overlay component (Option B)

      // F. Concede Flash Red Overlay
      if (state.flashRed > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${state.flashRed / 30})`; // fade red
        ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
        state.flashRed--;
      }

      // Next frame loop
      if (gameRef.current.lives > 0) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, soundEnabled]);

  // Handle mouse and touch events directly on canvas
  const handlePointer = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Scale pointer coordinate to 800px canvas internal space
    const x = ((clientX - rect.left) / rect.width) * 800;
    const newX = Math.max(160, Math.min(640, x));
    gameRef.current.goalieX = newX;
    if (goalieDivRef.current) {
      goalieDivRef.current.style.left = `${(newX / 800) * 100}%`;
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full">
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex gap-4">
          <div className="text-sm font-semibold">
            Score: <span className="text-primary font-bold text-lg">{score}</span>
          </div>
          <div className="text-sm font-semibold text-slate-500">
            High Score: <span className="text-slate-700 font-semibold">{highScore}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`text-xl transition-all duration-300 ${
                  i < lives ? "opacity-100 scale-100" : "opacity-20 scale-75 filter grayscale"
                }`}
              >
                ❤️
              </span>
            ))}
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 hover:text-slate-600 text-sm focus:outline-none"
            title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      <div className="relative w-full max-w-[800px] aspect-[16/10] overflow-hidden rounded-xl bg-slate-900 border border-outline-variant shadow-lg">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full h-full cursor-none"
          onMouseMove={(e) => handlePointer(e.clientX)}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointer(e.touches[0].clientX);
          }}
        />

        {/* Robot Goalie Overlay (Option B: Tailwind React Components) */}
        <div
          ref={goalieDivRef}
          className={`absolute select-none pointer-events-none transition-transform duration-200 origin-center ${
            robotState === "save"
              ? "scale-105 shadow-emerald-500/20"
              : robotState === "miss"
              ? "animate-bounce"
              : "hover:scale-102"
          }`}
          style={{
            left: "50%",
            top: "18%",
            transform: "translate(-50%, -45%)",
            width: "80px",
            height: "70px",
            zIndex: 30,
            filter: "drop-shadow(1px 0px 0px #475569) drop-shadow(-1px 0px 0px #475569) drop-shadow(0px 1px 0px #475569) drop-shadow(0px -1px 0px #475569)",
          }}
        >
          {/* Robot Head / Helmet */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
            <div className="w-11 h-9 bg-amber-50 border border-amber-200 rounded-t-full rounded-b-xl relative flex items-center justify-center shadow-md">
              {/* Visor Screen */}
              <div className={`w-8 h-5 bg-black border rounded-md relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
                robotState === "default"
                  ? "border-cyan-400/90 shadow-[0_0_6px_rgba(34,211,238,0.7)]"
                  : robotState === "save"
                  ? "border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : "border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
              }`}>
                {robotState === "default" && (
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee]"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee]"></div>
                  </div>
                )}
                {robotState === "save" && (
                  <svg className="w-4 h-3 text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                    <path d="M4 10 Q12 18 20 10" />
                  </svg>
                )}
                {robotState === "miss" && (
                  <div className="flex flex-col items-center justify-center gap-0 mt-0.5">
                    <div className="flex gap-1 text-[7px] font-bold text-rose-500 font-mono leading-none drop-shadow-[0_0_3px_rgba(244,63,94,0.8)]">
                      <span>X</span>
                      <span>X</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Robot Torso / Armor */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-50/90 border border-amber-200 rounded-b-md rounded-t-sm flex flex-col items-center justify-center overflow-hidden shadow-inner z-10">
            <div className={`w-5 h-4 border-t-0 border-x border-b rounded-b-sm flex flex-col items-center justify-center bg-amber-100/40 ${
              robotState === "default"
                ? "border-slate-300 shadow-[0_0_4px_rgba(226,232,240,0.6)]"
                : robotState === "save"
                ? "border-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                : "border-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]"
            }`}>
              <div className={`w-2 h-0.5 rounded-full ${
                robotState === "default"
                  ? "bg-slate-300 shadow-[0_0_3px_rgba(203,213,225,0.8)]"
                  : robotState === "save"
                  ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"
                  : "bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]"
              }`}></div>
            </div>
          </div>

          {/* Shoulders & Sleek Arm Connectors */}
          {/* Left */}
          <div className="absolute top-8 left-3 -translate-x-1/2 z-0">
            <div className="w-3 h-3 bg-amber-100 rounded-full border border-amber-200 relative">
              <div className={`absolute top-0 right-0 w-1.5 h-1.5 rounded-full border-t border-r ${
                robotState === "default" ? "border-slate-300" : robotState === "save" ? "border-emerald-400" : "border-rose-500"
              }`}></div>
            </div>
            <div className="w-1.5 h-4 bg-amber-50/90 border-l border-amber-200 origin-top rotate-[20deg] -translate-x-0.5"></div>
          </div>
          {/* Right */}
          <div className="absolute top-8 right-3 translate-x-1/2 z-0">
            <div className="w-3 h-3 bg-amber-100 rounded-full border border-amber-200 relative">
              <div className={`absolute top-0 left-0 w-1.5 h-1.5 rounded-full border-t border-l ${
                robotState === "default" ? "border-slate-300" : robotState === "save" ? "border-emerald-400" : "border-rose-500"
              }`}></div>
            </div>
            <div className="w-1.5 h-4 bg-amber-50/90 border-r border-amber-200 origin-top -rotate-[20deg] translate-x-0.5"></div>
          </div>

          {/* Left Glove (Small Round Mitt) */}
          <div
            className="absolute top-11 left-0 z-20"
            style={{ transform: "rotate(-5deg)" }}
          >
            <div className={`w-5 h-5 bg-amber-50 border rounded-full flex items-center justify-center relative shadow-md ${
              robotState === "default"
                ? "border-slate-300 shadow-[0_0_5px_rgba(226,232,240,0.6)]"
                : robotState === "save"
                ? "border-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]"
                : "border-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.7)]"
            }`}>
              <div className="w-3.5 h-3.5 bg-amber-100/60 border border-amber-200 rounded-full flex items-center justify-center">
                <div className={`w-1 h-1 rounded-full ${
                  robotState === "default" ? "bg-slate-300" : robotState === "save" ? "bg-emerald-400" : "bg-rose-500"
                }`}></div>
              </div>
              <div className={`absolute -top-0.5 -left-0.5 w-2 h-2 border-t border-l rounded-tl-sm ${
                robotState === "default" ? "border-slate-300" : robotState === "save" ? "border-emerald-400" : "border-rose-500"
              }`}></div>
            </div>
          </div>

          {/* Right Glove (Small Round Mitt) */}
          <div
            className="absolute top-11 right-0 z-20"
            style={{ transform: "rotate(5deg)" }}
          >
            <div className={`w-5 h-5 bg-amber-50 border rounded-full flex items-center justify-center relative shadow-md ${
              robotState === "default"
                ? "border-slate-300 shadow-[0_0_5px_rgba(226,232,240,0.6)]"
                : robotState === "save"
                ? "border-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]"
                : "border-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.7)]"
            }`}>
              <div className="w-3.5 h-3.5 bg-amber-100/60 border border-amber-200 rounded-full flex items-center justify-center">
                <div className={`w-1 h-1 rounded-full ${
                  robotState === "default" ? "bg-slate-300" : robotState === "save" ? "bg-emerald-400" : "bg-rose-500"
                }`}></div>
              </div>
              <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 border-t border-r rounded-tr-sm ${
                robotState === "default" ? "border-slate-300" : robotState === "save" ? "border-emerald-400" : "border-rose-500"
              }`}></div>
            </div>
          </div>
        </div>

        {gameState === "idle" && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center space-y-4 p-6 text-center">
            <div className="text-4xl animate-bounce">⚽</div>
            <h2 className="text-2xl font-bold text-pitch-50">Local Goalkeeper Game</h2>
            <p className="text-slate-300 text-sm max-w-sm">
              Use your **mouse, finger, or Left/Right Arrow keys** to slide the goalkeeper gloves and block incoming shots!
            </p>
            <Button onClick={startGame} className="px-6 py-2.5 font-semibold bg-primary text-white hover:bg-primary/90 rounded-md">
              Start Game 🚀
            </Button>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-4 p-6 text-center animate-fade-in">
            <div className="text-4xl">🏆</div>
            <h2 className="text-2xl font-bold text-rose-500">Game Over</h2>
            <p className="text-slate-200 text-sm font-medium">
              You saved <span className="text-primary font-bold">{score}</span> balls!
            </p>
            {score === highScore && score > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-pulse font-semibold">
                New High Score!
              </span>
            )}
            <Button onClick={startGame} className="px-6 py-2 bg-primary text-white hover:bg-primary/90 font-semibold rounded-md">
              Play Again 🔄
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 text-slate-500 text-[11px] w-full text-center">
        <span>Controls: Arrow keys / Mouse Drag / Touch Swipe</span>
      </div>
    </div>
  );
}
