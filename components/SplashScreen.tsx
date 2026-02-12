import React, { useMemo } from 'react';
import { Hexagon } from 'lucide-react';

interface SplashScreenProps {
    opacity: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ opacity }) => {
    // Generate random bubbles
    const bubbles = useMemo(() => {
        const colors = ['bg-amber-400', 'bg-blue-400', 'bg-emerald-400', 'bg-rose-300', 'bg-violet-400'];
        return Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            size: `${Math.random() * 20 + 10}px`, // 10px to 30px
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: `${Math.random() * 2}s`,
            duration: `${Math.random() * 3 + 3}s`, // 3s to 6s
        }));
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white transition-opacity duration-700 ease-out overflow-hidden"
            style={{ opacity }}
        >
            {/* CSS for custom animations if not in tailwind config */}
            <style>{`
        @keyframes floatUser {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          20% { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }
        @keyframes shakeUser {
            0%, 100% { transform: translateX(0); }
            10% { transform: translateX(-10px) rotate(-5deg); }
            20% { transform: translateX(8px) rotate(4deg); }
            30% { transform: translateX(-6px) rotate(-3deg); }
            40% { transform: translateX(4px) rotate(2deg); }
            50% { transform: translateX(-2px) rotate(-1deg); }
            60% { transform: translateX(0); }
        }
        .animate-float {
            animation: floatUser linear infinite;
        }
        .animate-shake {
            animation: shakeUser 0.8s cubic-bezier(.36,.07,.19,.97) both;
            animation-delay: 0.2s;
        }
      `}</style>

            {/* BUBBLES BACKGROUND */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {bubbles.map(bubble => (
                    <div
                        key={bubble.id}
                        className={`absolute rounded-full opacity-0 ${bubble.color} animate-float`}
                        style={{
                            left: bubble.left,
                            width: bubble.size,
                            height: bubble.size,
                            animationDelay: bubble.delay,
                            animationDuration: bubble.duration,
                            bottom: '-50px' // Start below screen
                        }}
                    />
                ))}
            </div>

            {/* CENTRAL CONTENT */}
            <div className="relative z-10 flex flex-col items-center">

                {/* LOGO CONTAINER with SHAKE */}
                <div className="flex flex-col items-center animate-shake transform-gpu">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                        <Hexagon size={80} className="text-amber-400 fill-amber-400/10 stroke-[1.5]" />
                    </div>

                    {/* TITLE */}
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 text-white drop-shadow-2xl">
                        HotelOS
                    </h1>
                </div>

                {/* SUBTITLE */}
                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.4em] animate-in fade-in zoom-in duration-1000 delay-500">
                    Nouvelle Gestion
                </p>

                {/* LOADING LINE */}
                <div className="mt-12 w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 animate-[progress_2s_ease-in-out_infinite]" />
                </div>

            </div>
        </div>
    );
};

export default SplashScreen;
