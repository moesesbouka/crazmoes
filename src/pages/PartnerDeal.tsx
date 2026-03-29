import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CORRECT_PASSWORD = "moe2025";

const CARDS = [
  {
    emoji: "💰",
    title: "Ownership & Profits",
    accent: "#f0b429",
    bullets: [
      "70% You / 30% Me",
      "You control all reinvestment decisions",
      "Profit splits paid monthly after expenses",
    ],
  },
  {
    emoji: "⚡",
    title: "My Role",
    accent: "#6366f1",
    bullets: [
      "Full-time commitment — 50–60+ hrs/week",
      "Inventory sourcing, operations, listings, systems",
      "Building and running everything day-to-day",
    ],
  },
  {
    emoji: "📦",
    title: "My Inventory In",
    accent: "#10b981",
    bullets: [
      "~$150K inventory contributed at cost",
      "$30K upfront buy-in from partner",
      "Remainder paid over time from profits",
    ],
  },
  {
    emoji: "💵",
    title: "Salary",
    accent: "#f59e0b",
    bullets: [
      "Base salary of $65K/year",
      "Fair compensation for full-time ops role",
      "Adjustable as business scales up",
    ],
  },
  {
    emoji: "💳",
    title: "Expense Account",
    accent: "#ec4899",
    bullets: [
      "Business covers gas, supplies, logistics",
      "No personal money spent on operations",
      "Monthly expense tracking & reporting",
    ],
  },
  {
    emoji: "🚗",
    title: "Business Vehicle",
    accent: "#8b5cf6",
    bullets: [
      "Vehicle access for pickups & deliveries",
      "Daily warehouse runs covered",
      "Insurance and maintenance included",
    ],
  },
  {
    emoji: "🗓",
    title: "Timeline",
    accent: "#14b8a6",
    bullets: [
      "Start immediately after agreement",
      "30–60 days to fully set up operations",
      "Weekly check-ins during ramp-up",
    ],
  },
];

type Choice = "yes" | "no" | "adjust" | null;

interface CardAnswer {
  choice: Choice;
  note: string;
}

function ConfettiBurst() {
  const [particles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1 + Math.random() * 1.5,
      color: ["#f0b429", "#10b981", "#6366f1", "#ec4899", "#14b8a6"][
        Math.floor(Math.random() * 5)
      ],
      size: 4 + Math.random() * 8,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: "50vh", x: `${p.x}vw`, opacity: 1, scale: 1 }}
          animate={{
            y: "-10vh",
            x: `${p.x + (Math.random() - 0.5) * 30}vw`,
            opacity: 0,
            rotate: Math.random() * 720,
            scale: 0.5,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 600);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0a0f" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <motion.div
          animate={error ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="rounded-2xl p-8 text-center"
          style={{ background: "#13131c", border: "1px solid #1e1e2e" }}
        >
          <div className="text-5xl mb-4">🔒</div>
          <h1
            className="text-2xl font-bold mb-1 text-white"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Private Access
          </h1>
          <p className="text-sm mb-6" style={{ color: "#6b6b80" }}>
            Enter password to continue
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-white text-center text-lg tracking-widest outline-none focus:ring-2"
              style={{
                background: "#0a0a0f",
                border: "1px solid #2a2a3a",
                
              }}
              autoFocus
            />
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm"
                style={{ color: "#ef4444" }}
              >
                Incorrect password
              </motion.p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-black transition-opacity hover:opacity-90"
              style={{ background: "#f0b429", fontFamily: "'Syne', sans-serif" }}
            >
              Unlock
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}

function DealCard({
  card,
  index,
  answer,
  onChoice,
  onNote,
  onNext,
  isLast,
}: {
  card: (typeof CARDS)[0];
  index: number;
  answer: CardAnswer;
  onChoice: (c: Choice) => void;
  onNote: (n: string) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const choiceMade = answer.choice !== null;

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-lg mx-auto"
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#13131c", border: "1px solid #1e1e2e" }}
      >
        {/* Accent top border */}
        <div className="h-1" style={{ background: card.accent }} />

        <div className="p-6 sm:p-8">
          {/* Card number */}
          <div className="text-sm font-medium mb-3" style={{ color: "#6b6b80" }}>
            Card {index + 1} of {CARDS.length} {card.emoji}
          </div>

          {/* Title */}
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-white mb-6"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {card.title}
          </h2>

          {/* Bullets */}
          <div className="space-y-3 mb-8">
            {card.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg mt-0.5" style={{ color: "#f0b429" }}>→</span>
                <span className="text-white/90" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {b}
                </span>
              </div>
            ))}
          </div>

          {/* Choice buttons */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => onChoice("yes")}
              className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all ${
                answer.choice === "yes" ? "ring-2 ring-offset-2 ring-offset-[#13131c]" : ""
              }`}
              style={{
                background: answer.choice === "yes" ? "#10b981" : "#10b98133",
                color: answer.choice === "yes" ? "#000" : "#10b981",
                
              }}
            >
              ✅ Locked in
            </button>
            <button
              onClick={() => onChoice("no")}
              className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all ${
                answer.choice === "no" ? "ring-2 ring-offset-2 ring-offset-[#13131c]" : ""
              }`}
              style={{
                background: answer.choice === "no" ? "#ef4444" : "#ef444433",
                color: answer.choice === "no" ? "#fff" : "#ef4444",
                
              }}
            >
              ❌ Not this
            </button>
            <button
              onClick={() => onChoice("adjust")}
              className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all ${
                answer.choice === "adjust" ? "ring-2 ring-offset-2 ring-offset-[#13131c]" : ""
              }`}
              style={{
                background: answer.choice === "adjust" ? "#3b82f6" : "#3b82f633",
                color: answer.choice === "adjust" ? "#fff" : "#3b82f6",
                
              }}
            >
              ✏️ Adjust
            </button>
          </div>

          {/* Notes textarea */}
          <AnimatePresence>
            {answer.choice === "adjust" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <textarea
                  value={answer.note}
                  onChange={(e) => onNote(e.target.value)}
                  placeholder="What would you change?"
                  rows={3}
                  className="w-full p-4 rounded-xl text-white text-sm resize-none outline-none focus:ring-2 mb-4"
                  style={{
                    background: "#0a0a0f",
                    border: "1px solid #2a2a3a",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next button */}
          <button
            onClick={onNext}
            disabled={!choiceMade}
            className="w-full py-3 rounded-xl font-semibold text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            style={{
              background: choiceMade ? "#f0b429" : "#f0b42966",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {isLast ? "View Summary →" : "Next Card →"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Summary({ answers }: { answers: CardAnswer[] }) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const choiceLabel = (c: Choice) => {
    if (c === "yes") return { text: "✅ Locked In", color: "#10b981" };
    if (c === "no") return { text: "❌ Not This", color: "#ef4444" };
    return { text: "✏️ Wants to Adjust", color: "#3b82f6" };
  };

  return (
    <>
      {showConfetti && <ConfettiBurst />}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg mx-auto"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h2
            className="text-3xl font-extrabold text-white"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Deal Summary
          </h2>
          <p className="text-sm mt-2" style={{ color: "#6b6b80" }}>
            Here's where you stand on each point
          </p>
        </div>

        <div className="space-y-3">
          {CARDS.map((card, i) => {
            const a = answers[i];
            const label = choiceLabel(a.choice);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl p-4"
                style={{ background: "#13131c", border: "1px solid #1e1e2e" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-semibold" style={{ fontFamily: "'Syne', sans-serif" }}>
                    {card.emoji} {card.title}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: label.color }}>
                    {label.text}
                  </span>
                </div>
                {a.choice === "adjust" && a.note && (
                  <p className="text-sm mt-2 pl-2 border-l-2" style={{ color: "#9ca3af", borderColor: "#3b82f6" }}>
                    {a.note}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

export default function PartnerDeal() {
  const [unlocked, setUnlocked] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [answers, setAnswers] = useState<CardAnswer[]>(
    CARDS.map(() => ({ choice: null, note: "" }))
  );
  const [showSummary, setShowSummary] = useState(false);

  const handleChoice = useCallback(
    (choice: Choice) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentCard] = { ...next[currentCard], choice };
        return next;
      });
    },
    [currentCard]
  );

  const handleNote = useCallback(
    (note: string) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentCard] = { ...next[currentCard], note };
        return next;
      });
    },
    [currentCard]
  );

  const handleNext = () => {
    if (currentCard < CARDS.length - 1) {
      setCurrentCard((p) => p + 1);
    } else {
      setShowSummary(true);
    }
  };

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  const progress = showSummary ? 100 : ((currentCard + (answers[currentCard].choice ? 0.5 : 0)) / CARDS.length) * 100;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0f", fontFamily: "'DM Sans', sans-serif" }}>
        {/* Progress bar */}
        <div className="w-full h-1" style={{ background: "#1e1e2e" }}>
          <motion.div
            className="h-full"
            style={{ background: "#f0b429" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
          <AnimatePresence mode="wait">
            {showSummary ? (
              <Summary key="summary" answers={answers} />
            ) : (
              <DealCard
                key={currentCard}
                card={CARDS[currentCard]}
                index={currentCard}
                answer={answers[currentCard]}
                onChoice={handleChoice}
                onNote={handleNote}
                onNext={handleNext}
                isLast={currentCard === CARDS.length - 1}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        {!showSummary && (
          <div className="flex justify-center gap-2 pb-6">
            {CARDS.map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                style={{
                  background:
                    i === currentCard
                      ? "#f0b429"
                      : answers[i].choice
                      ? "#10b981"
                      : "#2a2a3a",
                  transform: i === currentCard ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
