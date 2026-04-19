import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Github, Layers, Zap, RefreshCw, ShieldCheck
} from "lucide-react";
import { Link } from "wouter";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { ThemeToggle } from "@/components/ThemeToggle";

// Architecture diagram from the actual README
const ARCH_DIAGRAM = `graph TD
    User(("User / Client")) -->|"1. Request Data"| API["API Gateway / App Server"]

    subgraph Cache_Layer ["Cache System"]
        API -->|"2. Check Cache"| Cache{"Cache&lt;K, V&gt;"}
        Cache -->|"3. Cache Hit — O(1)"| API
    end

    subgraph Persistence_Layer ["Data Source"]
        Cache -.->|"4. Cache Miss"| DB[("Primary Database")]
        DB -.->|"5. Fetch Data"| API
        API -.->|"6. Update Cache"| Cache
    end

    style Cache fill:#1d4ed8,stroke:#3b82f6,color:#e2e8f0
    style DB fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style API fill:#1e293b,stroke:#475569,color:#e2e8f0
    style User fill:#312e81,stroke:#818cf8,color:#e2e8f0`;

// Real code from Cache.java — getFromCache method (LRU/LFU + TTL expiry)
const GET_CODE = `// Cache.java — get() with TTL expiry & priority tracking
public CompletionStage<VALUE> get(KEY key) {
    return getThreadFor(key, getFromCache(key));
}

private CompletionStage<VALUE> getFromCache(KEY key) {
    CompletionStage<Record<KEY, VALUE>> result;

    if (!cache.containsKey(key)) {
        // Cache miss — load from DataSource, store result
        result = addToCache(key, loadFromDB(dataSource, key));
    } else {
        result = cache.get(key).thenCompose(record -> {
            if (hasExpired(record)) {
                // TTL expired — evict, reload from DB
                expiryQueue.get(record.getLoadTime()).remove(key);
                priorityQueue.get(record.getAccessDetails()).remove(key);
                eventQueue.add(
                    new Eviction<>(record, Eviction.Type.EXPIRY, timer.getCurrentTime())
                );
                return addToCache(key, loadFromDB(dataSource, key));
            } else {
                return CompletableFuture.completedFuture(record);
            }
        });
    }

    // Update priority queue (LRU: access time | LFU: access count + time)
    return result.thenApply(record -> {
        priorityQueue.get(record.getAccessDetails()).remove(key);
        final var updated = record.getAccessDetails().update(timer.getCurrentTime());
        priorityQueue.putIfAbsent(updated, new CopyOnWriteArrayList<>());
        priorityQueue.get(updated).add(key);
        record.setAccessDetails(updated);
        return record.getValue();
    });
}`;

// Real code from Cache.java — manageEntries (eviction logic)
const EVICTION_CODE = `// Cache.java — eviction management (LRU / LFU)
private synchronized void manageEntries() {
    if (cache.size() >= maximumSize) {

        // Phase 1: sweep expired entries first (TTL-based)
        while (!expiryQueue.isEmpty() && hasExpired(expiryQueue.firstKey())) {
            List<KEY> expired = expiryQueue.pollFirstEntry().getValue();
            for (KEY key : expired) {
                Record<KEY, VALUE> rec = cache.remove(key).toCompletableFuture().join();
                priorityQueue.remove(rec.getAccessDetails());
                eventQueue.add(new Eviction<>(rec, Eviction.Type.EXPIRY, timer.getCurrentTime()));
            }
        }

        // Phase 2: if still full, evict lowest-priority entry
        // LRU  → sorted by last access timestamp (oldest = lowest priority)
        // LFU  → sorted by access count, then timestamp (rarest = lowest)
        if (cache.size() >= maximumSize) {
            List<KEY> keys = priorityQueue.pollFirstEntry().getValue();
            while (keys.isEmpty()) {
                keys = priorityQueue.pollFirstEntry().getValue();
            }
            for (KEY key : keys) {
                Record<KEY, VALUE> rec = cache.remove(key).toCompletableFuture().join();
                expiryQueue.get(rec.getLoadTime()).remove(rec.getKey());
                eventQueue.add(
                    new Eviction<>(rec, Eviction.Type.REPLACEMENT, timer.getCurrentTime())
                );
            }
        }
    }
}`;

// Real CacheBuilder usage
const BUILDER_CODE = `// CacheBuilder.java — fluent builder API
Cache<String, User> cache = new CacheBuilder<String, User>()
    .maximumSize(10_000)                       // max entries before eviction
    .expiryTime(Duration.ofMinutes(30))        // TTL per entry
    .evictionAlgorithm(EvictionAlgorithm.LRU) // or LFU
    .persistAlgorithm(PersistAlgorithm.WRITE_THROUGH) // or WRITE_BACK
    .poolSize(8)                               // thread shards (1 per shard)
    .loadKeysOnStart(Set.of("user:1", "user:2")) // eager-load on init
    .dataSource(new DataSource<String, User>() {
        @Override
        public CompletionStage<User> load(String key) {
            return db.findUserAsync(key);  // async DB load on miss
        }
        @Override
        public CompletionStage<Void> persist(String key, User value, long ts) {
            return db.saveUserAsync(key, value); // async DB write
        }
    })
    .build();

// All operations are fully async — CompletionStage<T>
CompletionStage<User> user = cache.get("user:42");
CompletionStage<Void> done = cache.set("user:42", updatedUser);`;

interface AccordionItem {
  id: string;
  title: string;
  badge: string;
  content: React.ReactNode;
}

const caseStudyItems: AccordionItem[] = [
  {
    id: "design",
    title: "Generic, Type-Safe Design",
    badge: "Architecture",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          The cache is implemented as a fully generic
          <span className="text-blue-400 font-mono font-semibold"> Cache&lt;KEY, VALUE&gt;</span> class.
          Any key-value pair is supported — strings, integers, domain objects — with no casting.
          The <span className="text-blue-400 font-mono">DataSource&lt;K,V&gt;</span> interface abstracts
          over any backing store (SQL, NoSQL, REST API), letting the cache remain storage-agnostic.
        </p>
        <ul className="space-y-2 mt-3">
          {[
            "ConcurrentHashMap stores futures (CompletionStage<Record<K,V>>) — reads never block writers",
            "ConcurrentSkipListMap for expiry queue — O(log n) ordered by load time",
            "ConcurrentSkipListMap for priority queue — sorted by LRU or LFU comparator at build time",
            "CopyOnWriteArrayList for the event queue — zero-contention audit trail",
          ].map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm">
              <span className="text-blue-400 mt-0.5 shrink-0">▸</span>
              <span className="font-mono text-slate-300">{p}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "eviction",
    title: "Dual Eviction — LRU & LFU",
    badge: "Eviction",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          The eviction algorithm is selected at build time via
          <span className="text-amber-400 font-mono"> EvictionAlgorithm.LRU</span> or
          <span className="text-amber-400 font-mono"> EvictionAlgorithm.LFU</span>.
          Both share the same priority queue infrastructure — only the comparator changes.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-amber-400 mb-1 font-mono">LRU</p>
            <p className="text-xs text-slate-400">
              Priority queue sorted by last access timestamp. The entry least recently accessed sits
              at the front and is evicted first. Ideal for temporal locality workloads.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-purple-400 mb-1 font-mono">LFU</p>
            <p className="text-xs text-slate-400">
              Sorted by access count first, then timestamp. The least frequently accessed entry
              is evicted. Ties are broken by recency. Ideal for frequency-skewed workloads.
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-2">
          Eviction runs in two phases: first expired (TTL) entries are swept, then if the cache
          is still at capacity the lowest-priority entry is displaced — emitting an
          <span className="text-slate-300 font-mono"> Eviction.Type.REPLACEMENT</span> event.
        </p>
      </div>
    ),
  },
  {
    id: "persistence",
    title: "Write-Through & Write-Back Persistence",
    badge: "Persistence",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          The cache supports two write strategies selectable via
          <span className="text-emerald-400 font-mono"> PersistAlgorithm</span>:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-emerald-400 mb-1 font-mono">WRITE_THROUGH</p>
            <p className="text-xs text-slate-400">
              Every <code className="text-slate-300">set()</code> immediately persists to the
              DataSource before returning. Guarantees zero data loss — the caller awaits the DB write.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-orange-400 mb-1 font-mono">WRITE_BACK</p>
            <p className="text-xs text-slate-400">
              Writes are deferred — the cache returns immediately and persists in the background.
              Trades durability for lower write latency. The test suite validates this with
              a controllable <code className="text-slate-300">CompletableFuture</code> queue.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "concurrency",
    title: "Thread-Safe by Design",
    badge: "Concurrency",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          Each key is deterministically routed to a single-threaded executor based on
          <span className="text-cyan-400 font-mono"> key.hashCode() % poolSize</span>.
          This means all operations for a given key are serialised on one thread —
          eliminating most locks while preserving order.
        </p>
        <ul className="space-y-2 mt-2">
          {[
            "Thread sharding by key hash — no lock contention between independent keys",
            "manageEntries() is synchronized — only one eviction sweep runs at a time",
            "AccessDetails uses LongAdder for lock-free, high-throughput access counting",
            "Race condition test fires 1,000,000 mixed reads/writes across 8 threads",
          ].map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm">
              <span className="text-cyan-400 mt-0.5 shrink-0">▸</span>
              {p}
            </li>
          ))}
        </ul>
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

  const tokenize = (line: string): { text: string; cls: string }[] => {
    const tokens: { text: string; cls: string }[] = [];
    let rest = line;
    const push = (text: string, cls: string) => tokens.push({ text, cls });

    while (rest.length > 0) {
      // Line comments
      const lineComment = rest.match(/^(\/\/.*)$/);
      if (lineComment) { push(lineComment[1], "text-slate-500 italic"); rest = ""; continue; }

      // Strings
      const str = rest.match(/^("(?:[^"\\]|\\.)*")/);
      if (str) { push(str[1], "text-amber-300"); rest = rest.slice(str[1].length); continue; }

      // Annotations
      const ann = rest.match(/^(@\w+)/);
      if (ann) { push(ann[1], "text-yellow-400"); rest = rest.slice(ann[1].length); continue; }

      // Java keywords
      const kw = rest.match(/^(public|private|final|static|void|return|if|else|while|for|new|this|class|interface|extends|implements|import|package|synchronized|null|true|false|var|abstract|throws|throw)\b/);
      if (kw) { push(kw[1], "text-purple-400 font-semibold"); rest = rest.slice(kw[1].length); continue; }

      // Types / generics
      const type = rest.match(/^(Cache|KEY|VALUE|Record|CompletionStage|CompletableFuture|List|Map|Set|String|Duration|DataSource|EvictionAlgorithm|PersistAlgorithm|CopyOnWriteArrayList|Eviction|Event|AccessDetails|User|Integer|Long|Void|CacheBuilder|K|V)\b/);
      if (type) { push(type[1], "text-cyan-400"); rest = rest.slice(type[1].length); continue; }

      // Numbers
      const num = rest.match(/^(\d[\d_]*)/);
      if (num) { push(num[1], "text-orange-300"); rest = rest.slice(num[1].length); continue; }

      // Method calls
      const method = rest.match(/^([a-zA-Z_]\w*)\s*(?=\()/);
      if (method) { push(method[1], "text-yellow-300"); rest = rest.slice(method[1].length); continue; }

      // Identifiers
      const id = rest.match(/^([a-zA-Z_]\w*)/);
      if (id) { push(id[1], "text-slate-200"); rest = rest.slice(id[1].length); continue; }

      // Everything else
      const other = rest.match(/^([^a-zA-Z0-9_]+)/);
      if (other) { push(other[1], "text-slate-400"); rest = rest.slice(other[1].length); continue; }

      push(rest[0], "text-slate-300"); rest = rest.slice(1);
    }
    return tokens;
  };

  const lines = code.split("\n");
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl" data-testid={`code-block-${filename}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-xs font-mono text-slate-400">{filename}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-600">{lang}</span>
          <button
            onClick={handleCopy}
            className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors px-2 py-0.5 rounded border border-slate-600 hover:border-slate-500"
            data-testid={`button-copy-${filename}`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto bg-[#0d1117] text-sm">
        <table className="min-w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                <td className="select-none text-right pr-4 pl-4 py-0 text-slate-700 font-mono text-xs w-10 shrink-0 border-r border-slate-800/80">
                  {i + 1}
                </td>
                <td className="pl-4 pr-6 py-0 font-mono whitespace-pre leading-6">
                  {line === "" ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokenize(line).map((tok, j) => (
                      <span key={j} className={tok.cls}>{tok.text}</span>
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

const features = [
  {
    icon: Layers,
    label: "Dual Eviction",
    value: "LRU + LFU",
    sub: "Configurable at build time",
    color: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
  },
  {
    icon: Zap,
    label: "Async-First",
    value: "CompletionStage",
    sub: "Non-blocking get & set",
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
  },
  {
    icon: RefreshCw,
    label: "Persistence",
    value: "Write-Through / Back",
    sub: "Selectable write strategy",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    icon: ShieldCheck,
    label: "Thread Safety",
    value: "Key-Sharded Pool",
    sub: "Deterministic thread routing",
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
              href="https://github.com/isandeep4/cache_system"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors border border-slate-700 px-3 py-1.5 rounded-lg hover:border-slate-500"
              data-testid="link-github-project"
            >
              <Github className="h-3.5 w-3.5" />
              View on GitHub
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
              {["Java", "Concurrency", "ConcurrentHashMap", "CompletionStage", "LRU / LFU"].map((tag) => (
                <span key={tag} className="text-xs font-mono px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800/60 text-slate-400">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight" data-testid="text-project-title">
              Generic In-Memory
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-blue-400">
                Cache System
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              A type-safe, async, thread-safe in-memory cache built in Java.
              Supports pluggable LRU and LFU eviction, configurable TTL expiry,
              write-through and write-back persistence, key-sharded thread pools,
              and a full event audit trail — all configured via a fluent builder API.
            </p>
          </motion.div>

          {/* Feature metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10"
          >
            {features.map(({ icon: Icon, label, value, sub, color, border, bg }) => (
              <div
                key={label}
                className={`flex flex-col gap-3 p-4 rounded-xl border ${border} ${bg}`}
                data-testid={`card-feature-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`p-2 rounded-lg border ${border} bg-slate-900/50 w-fit`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className={`text-sm font-bold font-mono ${color} leading-tight`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
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
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            The cache sits between the application layer and the backing data source.
            On a cache hit the entry is returned in O(1) time. On a miss the
            <span className="text-slate-300 font-mono"> DataSource.load()</span> is called
            asynchronously, the result is stored, and the caller receives the value.
          </p>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6 overflow-hidden">
            <MermaidDiagram chart={ARCH_DIAGRAM} />
          </div>
        </motion.section>

        {/* ── Key Features ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          data-testid="section-case-study"
        >
          <SectionHeading number="02" title="Design Deep-Dive" />
          <Accordion items={caseStudyItems} />
        </motion.section>

        {/* ── Real Code ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          data-testid="section-code"
          className="space-y-8"
        >
          <SectionHeading number="03" title="Code Walkthrough" />

          <div>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
              <span className="text-slate-200 font-mono">getFromCache()</span> — handles both
              hit and miss paths, checks TTL expiry, and updates the priority queue for the chosen
              eviction algorithm in a single non-blocking chain.
            </p>
            <CodeBlock code={GET_CODE} filename="Cache.java — getFromCache()" lang="Java" />
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
              <span className="text-slate-200 font-mono">manageEntries()</span> — runs in two
              phases: first sweeps TTL-expired entries, then evicts the lowest-priority entry
              (LRU oldest / LFU rarest) if the cache is still at capacity.
            </p>
            <CodeBlock code={EVICTION_CODE} filename="Cache.java — manageEntries()" lang="Java" />
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
              <span className="text-slate-200 font-mono">CacheBuilder</span> — fluent API
              for configuring every dimension of the cache: size, TTL, eviction algorithm,
              persistence strategy, thread pool size, and eager-load keys.
            </p>
            <CodeBlock code={BUILDER_CODE} filename="CacheBuilder.java — usage" lang="Java" />
          </div>
        </motion.section>

      </main>

      <footer className="border-t border-slate-800 mt-24 py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm text-slate-600 font-mono">isandeep4 / cache_system</span>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors" data-testid="link-footer-back">
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
