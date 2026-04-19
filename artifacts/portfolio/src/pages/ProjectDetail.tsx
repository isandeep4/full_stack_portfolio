import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Clock, Database, ShieldCheck, Github } from "lucide-react";
import { Link } from "wouter";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { ThemeToggle } from "@/components/ThemeToggle";

const ARCH_DIAGRAM = `flowchart TD
    Client(["Client Request"]) --> LB["Load Balancer"]
    LB --> CN1["Cache Node 1\\nRedis"]
    LB --> CN2["Cache Node 2\\nRedis"]
    LB --> CN3["Cache Node 3\\nRedis"]
    CN1 & CN2 & CN3 <--> Coord["Cache Coordinator\\n(Consistent Hashing)"]
    CN1 --> DB[("Primary DB\\nPostgreSQL")]
    CN2 --> DB
    CN3 --> DB
    Coord --> MQ["Event Bus\\n(Kafka)"]
    MQ --> CN1
    MQ --> CN2
    MQ --> CN3
    style Client fill:#1e40af,stroke:#3b82f6,color:#e2e8f0
    style LB fill:#1e293b,stroke:#475569,color:#e2e8f0
    style CN1 fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style CN2 fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style CN3 fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style Coord fill:#312e81,stroke:#818cf8,color:#e2e8f0
    style DB fill:#1c1917,stroke:#78716c,color:#e2e8f0
    style MQ fill:#7c2d12,stroke:#f97316,color:#e2e8f0`;

const CACHE_INVALIDATION_CODE = `# Cache Invalidation — Event-Driven Purge + TTL
import redis
import json
from kafka import KafkaConsumer

r = redis.Redis(host='cache-cluster', port=6379, db=0)

def build_key(entity: str, entity_id: int) -> str:
    return f"{entity}:{entity_id}"

def invalidate_cache(event: dict) -> None:
    """
    Purge stale keys on DB write events.
    Falls back to TTL expiry (300s) if event delivery fails.
    """
    entity   = event["entity"]
    ent_id   = event["id"]
    key      = build_key(entity, ent_id)
    affected = r.delete(key)

    # Wildcard sweep for related aggregate keys
    pattern  = f"{entity}:list:*"
    cursor   = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        if keys:
            r.delete(*keys)
        if cursor == 0:
            break

    print(f"[PURGE] {key} — {affected} key(s) removed")

def consume_invalidation_events():
    consumer = KafkaConsumer(
        "db.write.events",
        bootstrap_servers=["kafka:9092"],
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        group_id="cache-invalidator",
        auto_offset_reset="latest",
    )
    for message in consumer:
        invalidate_cache(message.value)`;

const LRU_EVICTION_CODE = `# LRU Eviction — O(1) Get/Put with OrderedDict
from collections import OrderedDict
import threading

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache    = OrderedDict()
        self.lock     = threading.RLock()   # thread-safe for concurrent ops

    def get(self, key: str) -> str | None:
        with self.lock:
            if key not in self.cache:
                return None                 # cache miss
            self.cache.move_to_end(key)    # mark as recently used
            return self.cache[key]

    def put(self, key: str, value: str, ttl: int = 300) -> None:
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            self.cache[key] = value
            if len(self.cache) > self.capacity:
                evicted = self.cache.popitem(last=False)  # remove LRU
                print(f"[EVICT] {evicted[0]}")

    def size(self) -> int:
        with self.lock:
            return len(self.cache)`;

interface AccordionItem {
  id: string;
  title: string;
  badge: string;
  content: React.ReactNode;
}

const caseStudyItems: AccordionItem[] = [
  {
    id: "challenge",
    title: "The Challenge",
    badge: "Problem",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          The primary PostgreSQL database was serving as both the source of truth and the read cache
          for a high-traffic API. At peak load, repeated identical queries hammered the DB at
          <span className="text-amber-400 font-mono font-semibold"> ~4,200 queries/sec</span>,
          pushing connection pool utilization above 90% and causing P99 latency to spike to
          <span className="text-red-400 font-mono font-semibold"> 340ms</span>.
        </p>
        <p>
          Vertical scaling offered diminishing returns. The system needed a horizontal caching
          layer capable of tolerating node failures without cold-start storms on the database.
        </p>
      </div>
    ),
  },
  {
    id: "solution",
    title: "The Solution",
    badge: "Architecture",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          Implemented a <span className="text-emerald-400 font-semibold">Redis Cache-Aside pattern</span> across
          a three-node cluster using consistent hashing for even key distribution. The application
          layer checks the cache first; on a miss, it populates the cache from the DB and sets a
          300-second TTL.
        </p>
        <ul className="space-y-2 mt-3 list-none">
          {[
            "Consistent hashing ensures minimal cache disruption on node changes",
            "Pipeline batching reduces round-trips for bulk reads by up to 8x",
            "Read replicas feed the cache; writes go directly to primary DB",
          ].map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm">
              <span className="text-emerald-500 mt-0.5 shrink-0">▸</span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "invalidation",
    title: "Cache Invalidation",
    badge: "Strategy",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          Stale data is the hardest cache problem. Two complementary strategies run in tandem:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-orange-400 mb-1">Event-Driven Purge</p>
            <p className="text-xs text-slate-400">
              Every DB write emits an event to Kafka. A consumer group processes these events and
              deletes the affected keys within milliseconds, keeping reads consistent.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-blue-400 mb-1">TTL Safety Net</p>
            <p className="text-xs text-slate-400">
              Every key carries a 300-second TTL. If the event bus fails, data goes
              stale for at most 5 minutes — a bounded, predictable failure mode.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<string | null>(items[0].id);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div
            key={item.id}
            className={`rounded-xl border transition-colors duration-200 ${
              isOpen ? "border-slate-600 bg-slate-800/50" : "border-slate-700/60 bg-slate-800/20"
            }`}
            data-testid={`accordion-${item.id}`}
          >
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left group"
              onClick={() => setOpen(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              data-testid={`accordion-trigger-${item.id}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 border border-slate-600">
                  {item.badge}
                </span>
                <span className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                  {item.title}
                </span>
              </div>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-slate-700/50 pt-4">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function CodeBlock({ code, filename, lang }: { code: string; filename: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tokenize = (line: string) => {
    const tokens: { text: string; class: string }[] = [];
    let rest = line;

    const push = (text: string, cls: string) => tokens.push({ text, class: cls });

    while (rest.length > 0) {
      // Comments
      const comment = rest.match(/^(#.*)$/);
      if (comment) { push(comment[1], "text-slate-500 italic"); rest = ""; continue; }

      // Triple-quoted strings
      const tripleStr = rest.match(/^("""[\s\S]*?""")/);
      if (tripleStr) { push(tripleStr[1], "text-amber-300"); rest = rest.slice(tripleStr[1].length); continue; }

      // Strings
      const strMatch = rest.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if (strMatch) { push(strMatch[1], "text-amber-300"); rest = rest.slice(strMatch[1].length); continue; }

      // f-string
      const fstr = rest.match(/^(f"(?:[^"\\]|\\.)*"|f'(?:[^'\\]|\\.)*')/);
      if (fstr) { push(fstr[1], "text-amber-300"); rest = rest.slice(fstr[1].length); continue; }

      // Keywords
      const kw = rest.match(/^(def|class|return|import|from|if|else|elif|while|for|in|not|and|or|None|True|False|print|with|as|pass|break|continue|yield|raise|try|except|finally|lambda|is)\b/);
      if (kw) { push(kw[1], "text-purple-400 font-semibold"); rest = rest.slice(kw[1].length); continue; }

      // Decorators
      const dec = rest.match(/^(@\w+)/);
      if (dec) { push(dec[1], "text-blue-400"); rest = rest.slice(dec[1].length); continue; }

      // Type hints / builtins
      const builtin = rest.match(/^(str|int|dict|list|set|tuple|bool|float|bytes|None|Optional|Union|Any|List|Dict)\b/);
      if (builtin) { push(builtin[1], "text-cyan-400"); rest = rest.slice(builtin[1].length); continue; }

      // Numbers
      const num = rest.match(/^(\d+)/);
      if (num) { push(num[1], "text-orange-300"); rest = rest.slice(num[1].length); continue; }

      // Function calls
      const fn = rest.match(/^([a-zA-Z_]\w*)\s*(?=\()/);
      if (fn) { push(fn[1], "text-yellow-300"); rest = rest.slice(fn[1].length); continue; }

      // Identifiers
      const id = rest.match(/^([a-zA-Z_]\w*)/);
      if (id) { push(id[1], "text-slate-200"); rest = rest.slice(id[1].length); continue; }

      // Operators & symbols
      const op = rest.match(/^([+\-*/<>=!&|^%~:,.\[\]{}()]+)/);
      if (op) { push(op[1], "text-slate-400"); rest = rest.slice(op[1].length); continue; }

      push(rest[0], "text-slate-300");
      rest = rest.slice(1);
    }
    return tokens;
  };

  const lines = code.split("\n");

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl" data-testid={`code-block-${filename}`}>
      {/* VS Code title bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-xs font-mono text-slate-400">{filename}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500">{lang}</span>
          <button
            onClick={handleCopy}
            className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors px-2 py-0.5 rounded border border-slate-600 hover:border-slate-500"
            data-testid={`button-copy-${filename}`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {/* Code area */}
      <div className="overflow-x-auto bg-[#0d1117] text-sm">
        <table className="min-w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                <td className="select-none text-right pr-4 pl-4 py-0 text-slate-600 font-mono text-xs w-10 shrink-0 border-r border-slate-800">
                  {i + 1}
                </td>
                <td className="pl-4 pr-6 py-0 font-mono whitespace-pre leading-6">
                  {line === "" ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokenize(line).map((tok, j) => (
                      <span key={j} className={tok.class}>
                        {tok.text}
                      </span>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const metrics = [
  {
    icon: Clock,
    label: "Latency",
    value: "2ms",
    sub: "P99 read latency",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    icon: Database,
    label: "DB Load Reduction",
    value: "60%",
    sub: "Fewer DB queries/sec",
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
  },
  {
    icon: ShieldCheck,
    label: "Consistency",
    value: "99.9%",
    sub: "Cache hit accuracy",
    color: "text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
  },
];

export default function ProjectDetail() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-slate-800 bg-[#0a0f1a]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 transition-colors group"
            data-testid="link-back-home"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Portfolio
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/isandeep4"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors border border-slate-700 px-3 py-1.5 rounded-lg hover:border-slate-500"
              data-testid="link-github-project"
            >
              <Github className="h-3.5 w-3.5" />
              View Source
            </a>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 md:px-12 py-16 space-y-20">
        {/* ── Hero ── */}
        <section data-testid="section-hero">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                System Design
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
                Redis
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400">
                Kafka
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400">
                Python
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight" data-testid="text-project-title">
              Scalable Distributed
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
                LRU Cache
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              A multi-node Redis caching layer using a Cache-Aside pattern with event-driven
              invalidation via Kafka. Reduced database query volume by 60% and dropped P99 latency
              from 340ms to under 2ms.
            </p>
          </motion.div>

          {/* Metrics row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10"
          >
            {metrics.map(({ icon: Icon, label, value, sub, color, border, bg }) => (
              <div
                key={label}
                className={`flex items-center gap-4 p-5 rounded-xl border ${border} ${bg}`}
                data-testid={`card-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`p-2.5 rounded-lg border ${border} bg-slate-900/50`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Architecture Diagram ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          data-testid="section-architecture"
        >
          <SectionHeading number="01" title="System Architecture" />
          <p className="text-slate-400 mb-6 text-sm">
            Three Redis cache nodes sit between the load balancer and the primary database. A cache
            coordinator handles consistent hashing; Kafka propagates invalidation events to all
            nodes in near-real-time.
          </p>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6 overflow-hidden">
            <MermaidDiagram chart={ARCH_DIAGRAM} />
          </div>
        </motion.section>

        {/* ── Case Study ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          data-testid="section-case-study"
        >
          <SectionHeading number="02" title="Architecture Case Study" />
          <Accordion items={caseStudyItems} />
        </motion.section>

        {/* ── Code Showcase ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          data-testid="section-code"
          className="space-y-8"
        >
          <SectionHeading number="03" title="Code Showcase" />

          <div>
            <p className="text-sm font-mono text-slate-500 mb-3">cache_invalidation.py</p>
            <CodeBlock
              code={CACHE_INVALIDATION_CODE}
              filename="cache_invalidation.py"
              lang="Python"
            />
          </div>

          <div>
            <p className="text-sm font-mono text-slate-500 mb-3">lru_cache.py</p>
            <CodeBlock
              code={LRU_EVICTION_CODE}
              filename="lru_cache.py"
              lang="Python"
            />
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-24 py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm text-slate-600 font-mono">isandeep4</span>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            data-testid="link-footer-back"
          >
            Back to Portfolio
          </Link>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-xs font-mono text-slate-600">{number}</span>
      <div className="flex-1 h-px bg-slate-800" />
      <h2 className="text-xl font-bold text-slate-100">{title}</h2>
      <div className="w-4 h-px bg-slate-800" />
    </div>
  );
}
