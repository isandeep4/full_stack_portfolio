import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Github, Radio, RefreshCw, AlertTriangle, GitBranch
} from "lucide-react";
import { Link } from "wouter";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { ThemeToggle } from "@/components/ThemeToggle";

const ARCH_DIAGRAM = `graph TD
    PUB(("Publisher")) -->|"publish(topic, event)"| BUS["EventBus"]

    subgraph Bus ["Event Bus — per Topic"]
        BUS --> LOG[("Append-Only Event Log")]
        LOG --> IDX["Indexes\n(Event ID · Timestamp · Subscriber)"]
    end

    subgraph Push ["PUSH Subscribers (event-driven)"]
        IDX -->|"auto-deliver"| RETRY["RetryAlgorithm\n(Exponential / Periodic)"]
        RETRY -->|"success"| PSub(["Subscriber Handler"])
        RETRY -->|"max retries exceeded"| DLQ["Dead Letter Queue\n(another EventBus)"]
    end

    subgraph Pull ["PULL Subscribers (consumer-driven)"]
        IDX -->|"poll(topic, id)"| PLSub(["Subscriber\n(tracks own offset)"])
        PLSub -->|"setIndexFromTimestamp / setIndexFromEvent"| IDX
    end

    style BUS fill:#1e3a5f,stroke:#3b82f6,color:#e2e8f0
    style LOG fill:#1e293b,stroke:#475569,color:#e2e8f0
    style IDX fill:#1e293b,stroke:#475569,color:#e2e8f0
    style RETRY fill:#3b1f5e,stroke:#8b5cf6,color:#e2e8f0
    style DLQ fill:#7f1d1d,stroke:#ef4444,color:#e2e8f0
    style PSub fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style PLSub fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style PUB fill:#312e81,stroke:#818cf8,color:#e2e8f0`;

// Real addEventToBus + push code from EventBus.java
const PUBLISH_CODE = `// EventBus.java — publish() routes to a keyed thread, then delivers
public void publish(Topic topic, Event event) {
    // All operations for this topic run on the same thread — no locks needed
    executor.submit(topic.getName(), () -> addEventToBus(topic, event));
}

private void addEventToBus(Topic topic, Event event) {
    // 1. Append event to the immutable log
    final var currentIndex = new Index(bus.get(topic).size());

    // 2. Update dual indexes: by timestamp (for seek/replay) and by event ID
    timestampIndex.get(topic).put(event.getTimeStamp(), currentIndex);
    eventIndex.get(topic).put(event.getId(), currentIndex);
    bus.get(topic).add(event);

    // 3. Fan-out to all PUSH subscribers immediately
    subscriptions.getOrDefault(topic, Collections.newSetFromMap(new ConcurrentHashMap<>()))
        .stream()
        .filter(sub -> SubscriptionType.PUSH.equals(sub.getType()))
        .forEach(sub -> push(event, sub));
}

// PUSH delivery — with retry and dead letter queue fallback
public void push(Event event, Subscription subscription) {
    executor.submit(subscription.getTopic().getName() + subscription.getsubscriberId(), () -> {
        try {
            retryAlgorithm.attempt(subscription.handler(), event, 0);
        } catch (RetryLimitExceededException e) {
            // Retry exhausted — route to dead letter queue
            if (deadLetterQueue != null) {
                deadLetterQueue.publish(subscription.getTopic(),
                    new FailureEvent(event, e, timer.getTime()));
            } else {
                e.printStackTrace();
            }
        }
    });
}`;

// Real poll + seek code from EventBus.java
const POLL_CODE = `// EventBus.java — PULL mode: each subscriber owns their read offset
public CompletionStage<Event> poll(Topic topic, EntityID subscriber) {
    return executor.get(topic.getName() + subscriber.getId(), () -> {
        final Index index = subscriberIndexes.get(topic).get(subscriber);
        try {
            final Event event = bus.get(topic).get(index.getVal());
            subscriberIndexes.get(topic).put(subscriber, index.increment()); // advance offset
            return event;
        } catch (IndexOutOfBoundsException exception) {
            return null; // no new events — subscriber is caught up
        }
    });
}

// Seek to just after a known event — replay from a checkpoint
public CompletionStage<Void> setIndexFromEvent(Topic topic, EventID eventId, EntityID subscriberId) {
    return executor.submit(topic.getName(), () -> {
        final var index = eventIndex.get(topic).get(eventId);
        subscriberIndexes.get(topic).put(subscriberId, index.increment());
    });
}

// Seek to a point in time — ConcurrentSkipListMap gives O(log n) higherEntry()
public CompletionStage<Void> setIndexFromTimeStamp(Topic topic, Timestamp timestamp, EntityID subscriber) {
    return executor.submit(topic.getName() + subscriber.getId(), () -> {
        final var entry = timestampIndex.get(topic).higherEntry(timestamp);
        if (entry == null) {
            // past the end — subscriber starts from now
            subscriberIndexes.get(topic).put(subscriber, new Index(bus.get(topic).size()));
        } else {
            subscriberIndexes.get(topic).put(subscriber, entry.getValue());
        }
    });
}`;

// Retry algorithms from ExponentialBackOff.java + RetryAlgorithm.java
const RETRY_CODE = `// RetryAlgorithm.java — generic pluggable retry with configurable back-off
public class RetryAlgorithm<P, R> {
    private final int maxAttempt;
    private final Function<Integer, Long> retryTimeCalculator; // attempt → sleep ms

    public R attempt(Function<P, R> task, P parameter, int attempt) {
        try {
            return task.apply(parameter);
        } catch (Exception e) {
            if (e.getCause() instanceof RetryAbleException) {
                if (attempt == maxAttempt) {
                    throw new RetryLimitExceededException();
                } else {
                    long sleep = retryTimeCalculator.apply(attempt);
                    Thread.sleep(sleep);
                    return attempt(task, parameter, attempt + 1); // recurse
                }
            } else {
                throw new RuntimeException(e);
            }
        }
    }
}

// ExponentialBackOff — waits 1s, 2s, 4s, 8s ... (2^attempt * 1000ms)
public class ExponentialBackOff<P, R> extends RetryAlgorithm<P, R> {
    public ExponentialBackOff(@Named("exponential-retry-attempts") int maxAttempt) {
        super(maxAttempt, (attempts) -> (long) Math.pow(2, attempts - 1) * 1000);
    }
}

// PeriodicRetry — fixed wait time between every attempt
public class PeriodicRetry<P, R> extends RetryAlgorithm<P, R> {
    public PeriodicRetry(@Named("periodic-retry-attempts") int maxAttempt,
                         @Named("periodic-retry-wait") long waitTimeInMillis) {
        super(maxAttempt, (__) -> waitTimeInMillis);
    }
}`;

interface AccordionItem {
  id: string;
  title: string;
  badge: string;
  content: React.ReactNode;
}

const caseStudyItems: AccordionItem[] = [
  {
    id: "pubsub",
    title: "Decoupled Pub/Sub with Dual Delivery",
    badge: "Core Design",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          Publishers and subscribers never reference each other — they only know about
          <span className="text-blue-400 font-mono font-semibold"> Topic</span>s.
          Subscribers choose their delivery model at subscribe time:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-emerald-400 mb-1 font-mono">PUSH</p>
            <p className="text-xs text-slate-400">
              Events are automatically delivered to the subscriber's handler function the
              moment they are published. Ideal for real-time, low-latency consumers.
              Failed deliveries are retried and eventually routed to the dead letter queue.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-amber-400 mb-1 font-mono">PULL</p>
            <p className="text-xs text-slate-400">
              Subscribers call <code className="text-slate-300">poll()</code> at their own pace.
              Each subscriber tracks its own read offset — they can be hours behind the publisher
              without any impact on other consumers.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "log",
    title: "Append-Only Event Log with Triple Indexing",
    badge: "Storage",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          Each topic's events are stored as an append-only
          <span className="text-blue-400 font-mono"> CopyOnWriteArrayList&lt;Event&gt;</span>.
          Events are never deleted — subscribers simply advance their offset pointer.
          Three concurrent indexes are maintained per topic:
        </p>
        <ul className="space-y-2 mt-2">
          {[
            { label: "eventIndex", desc: "Map<EventID, Index> — O(1) lookup by event ID (jump to any known event)", color: "text-blue-400" },
            { label: "timestampIndex", desc: "ConcurrentSkipListMap<Timestamp, Index> — O(log n) seek to any point in time via higherEntry()", color: "text-violet-400" },
            { label: "subscriberIndexes", desc: "Map<EntityID, Index> per subscriber — independent read offsets like Kafka consumer groups", color: "text-emerald-400" },
          ].map(({ label, desc, color }) => (
            <li key={label} className="flex items-start gap-2 text-sm">
              <span className={`font-mono font-semibold shrink-0 mt-0.5 ${color}`}>{label}</span>
              <span className="text-slate-400">— {desc}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "retry",
    title: "Pluggable Retry with Dead Letter Queue",
    badge: "Resilience",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          Every PUSH delivery goes through a
          <span className="text-purple-400 font-mono"> RetryAlgorithm&lt;P,R&gt;</span> that
          recursively retries on <span className="text-red-400 font-mono">RetryAbleException</span>.
          Two implementations are provided:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-orange-400 mb-1 font-mono">ExponentialBackOff</p>
            <p className="text-xs text-slate-400 font-mono">
              delay = 2<sup>attempt − 1</sup> × 1000ms<br />
              <span className="text-slate-500">(1s, 2s, 4s, 8s …)</span>
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-sm font-semibold text-cyan-400 mb-1 font-mono">PeriodicRetry</p>
            <p className="text-xs text-slate-400 font-mono">
              delay = fixed waitTimeInMillis<br />
              <span className="text-slate-500">(same interval every attempt)</span>
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-2">
          When a subscriber exceeds <span className="text-slate-300 font-mono">maxAttempt</span>,
          the event is wrapped in a
          <span className="text-red-400 font-mono"> FailureEvent</span> and published to a
          <span className="text-red-400 font-mono"> dead letter queue</span> — which is itself
          another <span className="text-slate-300 font-mono">EventBus</span>, so failed events
          can be inspected, replayed, or alerted on.
        </p>
      </div>
    ),
  },
  {
    id: "concurrency",
    title: "Topic-Sharded Concurrency via KeyedExecutor",
    badge: "Concurrency",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          <span className="text-cyan-400 font-mono">KeyedExecutor</span> maintains a fixed pool
          of single-threaded executors. Every operation is routed to a thread by hashing the key:
        </p>
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 mt-2 font-mono text-sm">
          <span className="text-slate-500">executor</span>
          <span className="text-slate-300">[</span>
          <span className="text-amber-300">topicId</span>
          <span className="text-slate-300">.</span>
          <span className="text-yellow-300">hashCode</span>
          <span className="text-slate-300">() % </span>
          <span className="text-cyan-400">executor.length</span>
          <span className="text-slate-300">]</span>
        </div>
        <ul className="space-y-2 mt-3">
          {[
            "All publish, subscribe, and poll calls for a topic run sequentially on one thread — no locking required",
            "PUSH delivery per subscriber runs on topic+subscriberId hash — fan-out is parallelized across threads",
            "ConcurrentHashMap, CopyOnWriteArrayList, and ConcurrentSkipListMap handle concurrent reads safely",
          ].map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm">
              <span className="text-cyan-400 mt-0.5 shrink-0">▸</span>
              <span className="text-slate-300">{p}</span>
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
      const lineComment = rest.match(/^(\/\/.*)$/);
      if (lineComment) { push(lineComment[1], "text-slate-500 italic"); rest = ""; continue; }
      const str = rest.match(/^("(?:[^"\\]|\\.)*")/);
      if (str) { push(str[1], "text-amber-300"); rest = rest.slice(str[1].length); continue; }
      const ann = rest.match(/^(@\w+)/);
      if (ann) { push(ann[1], "text-yellow-400"); rest = rest.slice(ann[1].length); continue; }
      const kw = rest.match(/^(public|private|final|static|void|return|if|else|while|for|new|this|class|interface|extends|implements|import|package|synchronized|null|true|false|var|abstract|throws|throw)\b/);
      if (kw) { push(kw[1], "text-purple-400 font-semibold"); rest = rest.slice(kw[1].length); continue; }
      const type = rest.match(/^(EventBus|Topic|Event|Subscription|SubscriptionType|RetryAlgorithm|ExponentialBackOff|PeriodicRetry|RetryLimitExceededException|RetryAbleException|FailureEvent|KeyedExecutor|Index|Timestamp|EntityID|EventID|CompletionStage|CompletableFuture|Collections|ConcurrentHashMap|ConcurrentSkipListMap|CopyOnWriteArrayList|Function|Timer|String|int|long|boolean|List|Map|Set|Void|R|P)\b/);
      if (type) { push(type[1], "text-cyan-400"); rest = rest.slice(type[1].length); continue; }
      const num = rest.match(/^(\d[\d_]*)/);
      if (num) { push(num[1], "text-orange-300"); rest = rest.slice(num[1].length); continue; }
      const method = rest.match(/^([a-zA-Z_]\w*)\s*(?=\()/);
      if (method) { push(method[1], "text-yellow-300"); rest = rest.slice(method[1].length); continue; }
      const id = rest.match(/^([a-zA-Z_]\w*)/);
      if (id) { push(id[1], "text-slate-200"); rest = rest.slice(id[1].length); continue; }
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
                  {line === "" ? <span>&nbsp;</span> : tokenize(line).map((tok, j) => (
                    <span key={j} className={tok.cls}>{tok.text}</span>
                  ))}
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
    icon: Radio,
    label: "Delivery Modes",
    value: "PUSH + PULL",
    sub: "Per-subscriber choice",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    icon: GitBranch,
    label: "Event Replay",
    value: "Timestamp Seek",
    sub: "ConcurrentSkipListMap O(log n)",
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
  },
  {
    icon: RefreshCw,
    label: "Retry Strategy",
    value: "Exp. Backoff / Periodic",
    sub: "Pluggable algorithm",
    color: "text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
  },
  {
    icon: AlertTriangle,
    label: "Failure Handling",
    value: "Dead Letter Queue",
    sub: "Another EventBus instance",
    color: "text-red-400",
    border: "border-red-500/20",
    bg: "bg-red-500/5",
  },
];

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

export default function EventBusDetail() {
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
              href="https://github.com/isandeep4/event_bus"
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
              {["Java", "Pub/Sub", "CompletionStage", "Retry", "Dead Letter Queue"].map((tag) => (
                <span key={tag} className="text-xs font-mono px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800/60 text-slate-400">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight" data-testid="text-project-title">
              Async Event Bus
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
                Pub/Sub System
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              A fully asynchronous, thread-safe publish/subscribe event bus built in Java.
              Supports PUSH and PULL delivery, per-subscriber offset tracking, timestamp-based
              replay, pluggable exponential/periodic retry, and a dead letter queue for
              undeliverable events — all backed by topic-sharded thread pools.
            </p>
          </motion.div>

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

        {/* ── Architecture ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          data-testid="section-architecture"
        >
          <SectionHeading number="01" title="System Architecture" />
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            Publishers append events to a topic's log without any knowledge of subscribers.
            PUSH subscribers receive events immediately with retry guarantees.
            PULL subscribers consume at their own pace, tracking their own read offset.
            Failed events flow to a dead letter queue — which is itself another EventBus.
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
          <SectionHeading number="02" title="Design Deep-Dive" />
          <Accordion items={caseStudyItems} />
        </motion.section>

        {/* ── Code ── */}
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
              <span className="text-slate-200 font-mono">publish() → addEventToBus() → push()</span>
              — the full PUSH delivery chain: append to the log, update dual indexes, fan-out to
              subscribers, retry on failure, dead letter queue fallback.
            </p>
            <CodeBlock code={PUBLISH_CODE} filename="EventBus.java — publish & push" lang="Java" />
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
              <span className="text-slate-200 font-mono">poll()</span> is the PULL delivery path —
              each subscriber has an independent offset that advances on every successful read.
              <span className="text-slate-200 font-mono"> setIndexFromTimestamp()</span> enables
              event replay from any point in time using the sorted timestamp index.
            </p>
            <CodeBlock code={POLL_CODE} filename="EventBus.java — poll & seek" lang="Java" />
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
              <span className="text-slate-200 font-mono">RetryAlgorithm</span> is a generic base
              class — the back-off timing is injected as a
              <span className="text-slate-200 font-mono"> Function&lt;Integer, Long&gt;</span>.
              Both <span className="text-slate-200 font-mono">ExponentialBackOff</span> and
              <span className="text-slate-200 font-mono"> PeriodicRetry</span> extend it with
              a single super() call, keeping each strategy to a handful of lines.
            </p>
            <CodeBlock code={RETRY_CODE} filename="RetryAlgorithm.java — retry strategies" lang="Java" />
          </div>
        </motion.section>

      </main>

      <footer className="border-t border-slate-800 mt-24 py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm text-slate-600 font-mono">isandeep4 / event_bus</span>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors" data-testid="link-footer-back">
            Back to Portfolio
          </Link>
        </div>
      </footer>
    </div>
  );
}
