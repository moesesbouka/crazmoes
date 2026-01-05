import { useEffect, useState } from "react";

interface Particle {
  id: number;
  emoji: string;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
}

const EMOJIS = ["💰", "🔥", "⭐", "💎", "🎉", "✨", "🛒", "🏷️", "💥", "🤑"];

export function FloatingParticles({ count = 15 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        left: Math.random() * 100,
        animationDuration: 8 + Math.random() * 12,
        animationDelay: Math.random() * 10,
        size: 16 + Math.random() * 20,
      });
    }
    setParticles(newParticles);
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute opacity-30"
          style={{
            left: `${particle.left}%`,
            fontSize: `${particle.size}px`,
            animation: `float-up ${particle.animationDuration}s linear infinite`,
            animationDelay: `${particle.animationDelay}s`,
          }}
        >
          {particle.emoji}
        </span>
      ))}
    </div>
  );
}
