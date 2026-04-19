import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Github, Leaf, BarChart2, Cloud, Database
} from "lucide-react";
import { Link } from "wouter";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { ThemeToggle } from "@/components/ThemeToggle";

const ARCH_DIAGRAM = `graph TD
    U(("User")) -->|"Answers questions"| CALC["Multi-step Questionnaire\n(Food · Travel · Home · Shopping)"]
    CALC -->|"useCalculator() Context"| CTX[("CalculatorContext\n(React state)")]
    CTX -->|"POST /api/submit"| LAMBDA["AWS Lambda\n(save-carbon-footprint)"]
    LAMBDA -->|"persists"| DB[("User Carbon Data\n(monthly store)")]

    CALC -->|"GET /api/climatiq/factors"| PROXY["Next.js API Route\n(Climatiq Proxy)"]
    PROXY -->|"Bearer token"| CLIMATIQ[["Climatiq API\n(emission factors)"]]

    DB -->|"GraphQL query"| GQL["Apollo Client\nGetUserCarbonData"]
    GQL -->|"renders"| DASH["Dashboard\n(MUI X DataGrid · monthly chart)"]
    CALC -->|"navigate"| RESULT["Result Page\nTotal · Breakdown · India vs World"]

    style CALC fill:#14532d,stroke:#22c55e,color:#e2e8f0
    style CTX fill:#1e293b,stroke:#475569,color:#e2e8f0
    style LAMBDA fill:#451a03,stroke:#f97316,color:#e2e8f0
    style DB fill:#1e293b,stroke:#475569,color:#e2e8f0
    style PROXY fill:#0c4a6e,stroke:#38bdf8,color:#e2e8f0
    style CLIMATIQ fill:#0c4a6e,stroke:#38bdf8,color:#e2e8f0
    style GQL fill:#3b0764,stroke:#a855f7,color:#e2e8f0
    style DASH fill:#1e293b,stroke:#475569,color:#e2e8f0
    style RESULT fill:#14532d,stroke:#22c55e,color:#e2e8f0
    style U fill:#312e81,stroke:#818cf8,color:#e2e8f0`;

// Real code from app/api/climatiq/route.ts
const CLIMATIQ_CODE = `// app/api/climatiq/route.ts — Next.js API route proxying Climatiq
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dataVersion = searchParams.get('data_version') || '%5E28';
  const page         = searchParams.get('page') || '1';

  // Optional filter params forwarded from the client
  const sector   = searchParams.get('sector');
  const category = searchParams.get('category');
  const year     = searchParams.get('year');
  const region   = searchParams.get('region');
  const source   = searchParams.get('source');
  const unitType = searchParams.get('unit_type');

  // Build Climatiq URL dynamically — only append filters that were provided
  let url = \`\${CLIMATIQ_BASE_URL}/data/api/activities?page=\${page}&data_version=\${dataVersion}\`;
  if (sector)   url += \`&sector=\${sector}\`;
  if (category) url += \`&category=\${category}\`;
  if (year)     url += \`&year=\${year}\`;
  if (region)   url += \`&region=\${region}\`;
  if (source)   url += \`&source=\${source}\`;
  if (unitType) url += \`&unit_type=\${unitType}\`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${CLIMATIQ_API_KEY}\`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: \`Climatiq API error: \${response.statusText}\`, details: errorText },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}`;

// Real code from app/calculator/result/breakdown.tsx
const BREAKDOWN_CODE = `// app/calculator/result/breakdown.tsx — category breakdown cards
const Cards = [
  { id: 1, field: "home",      title: "HOME",     bgcolor: "#0094d5", iconElement: <HomeIcon />,          subRoute: "home"      },
  { id: 2, field: "food",      title: "FOOD",     bgcolor: "#f89834", iconElement: <RamenDiningIcon />,   subRoute: "food"      },
  { id: 3, field: "transport", title: "TRAVEL",   bgcolor: "#00b9ad", iconElement: <LocalAirportIcon />,  subRoute: "transport" },
  { id: 4, field: "shopping",  title: "SHOPPING", bgcolor: "#d04092", iconElement: <ShoppingBasketIcon />,subRoute: "shopping"  },
];

export const Breakdown: FC<{
  home: number; transport: number; food: number; shopping: number; total: number;
}> = (props) => (
  <Grid container direction="column" spacing={4} padding={4} mt={4}>
    <Box>
      <Typography variant="h4">Let's Break It Down</Typography>
      <Typography variant="h6">{(\`YOUR FOOTPRINT IS EQUAL TO \${props.total}\`)}</Typography>
    </Box>

    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "space-between" }}>
      {Cards.map((card) => (
        <Grid sx={{ flexBasis: "40%", display: "flex" }} key={card.id}>

          {/* Coloured icon tile showing % share of total */}
          <Grid size={{ xs: 6, md: 4 }}>
            <Item sx={{ bgcolor: card.bgcolor }}>
              <Box sx={{ padding: "2.6rem" }}>
                {card.iconElement}
                <Typography>
                  {Math.round((props[card.field] / props.total) * 100)}%
                </Typography>
              </Box>
            </Item>
          </Grid>

          {/* Stats + action button */}
          <Grid size={{ xs: 6, md: 8 }}>
            <Item>
              <Typography>{card.title}</Typography>
              <Typography>
                {(\`Your consumption is equal to \${Math.round(props[card.field])} Kg\`)}
              </Typography>
              <Button onClick={() => redirect(\`result/\${card.subRoute}\`)}>
                REDUCE THIS SCORE
              </Button>
            </Item>
          </Grid>

        </Grid>
      ))}
    </Box>
  </Grid>
);`;

// Real GraphQL query + submit API code
const GRAPHQL_CODE = `// app/graphql/queries/userCarbonDataQueries.ts — Apollo query
export const GET_USER_CARBON_DATA = gql\`
  query GetUserCarbonData($id: String!) {
    UserCarbonDetails(userId: $id) {
      userId
      carbonFootprints {
        month
        food
        home
        shopping
        transport
        total_emissions
      }
    }
  }
\`;

// app/api/submit/route.ts — proxy POST to AWS Lambda
export async function POST(req) {
  const body = await req.json();

  // Forward questionnaire answers to serverless backend
  const response = await fetch(
    "https://2doh6ahg6b.execute-api.us-east-1.amazonaws.com/save-carbon-footprint",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  return Response.json({ success: true, message: "Data received." });
}`;

interface AccordionItem {
  id: string;
  title: string;
  badge: string;
  content: React.ReactNode;
}

const caseStudyItems: AccordionItem[] = [
  {
    id: "questionnaire",
    title: "Dynamic Multi-Step Questionnaire",
    badge: "UX Flow",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          The calculator walks users through four sections —
          <span className="text-green-400 font-mono"> Food</span>,
          <span className="text-green-400 font-mono"> Travel</span>,
          <span className="text-green-400 font-mono"> Home</span>, and
          <span className="text-green-400 font-mono"> Shopping</span> — using a graph-based
          question model where each option carries a
          <span className="text-slate-200 font-mono"> nextQuestionId</span> and
          <span className="text-slate-200 font-mono"> prevQuestionId</span>, enabling branching
          paths without a fixed linear sequence.
        </p>
        <ul className="space-y-2 mt-3">
          {[
            "CalculatorContext (React Context) holds all answers in-memory — no page reloads needed",
            "Progress bars track completion per section using a fraction of the section's question count",
            "Validation runs before navigation — enforces answer selection or all text fields filled",
            "Back navigation restores prior answers from context (no re-fetching, instant)",
          ].map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm">
              <span className="text-green-400 mt-0.5 shrink-0">▸</span>
              <span className="text-slate-300">{p}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "climatiq",
    title: "Climatiq API — Real Emission Factors",
    badge: "External API",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          Emission factors come from the
          <span className="text-sky-400 font-mono"> Climatiq</span> database — a curated,
          versioned dataset of CO2e factors covering thousands of activities worldwide.
          A Next.js API route acts as a secure proxy, keeping the API key server-side
          and adding composable query filtering:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            { label: "/api/climatiq", desc: "Paginated activity browser — filter by sector, category, year, region, source, or unit type", color: "text-sky-400" },
            { label: "/api/climatiq/factors", desc: "Factor lookup by activity_id — returns emission factor value, unit, source, LCA scope, and data quality flags", color: "text-sky-400" },
          ].map(({ label, desc, color }) => (
            <div key={label} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <p className={`text-sm font-semibold mb-1 font-mono ${color}`}>{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-400 mt-2">
          The dashboard also renders a nested MUI X DataGrid: activity rows expand to show
          emission factor rows, which expand again to show full metadata (Activity ID, source
          dataset, year released, region, uncertainty, LCA activity, data quality flags).
        </p>
      </div>
    ),
  },
  {
    id: "results",
    title: "Result Page — India & Global Comparison",
    badge: "Analytics",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          After completing all four sections, the result page receives the calculated footprint
          and renders three contextual comparisons:
        </p>
        <ul className="space-y-2 mt-2">
          {[
            { label: "Total footprint", desc: "sum of food + home + transport + shopping in kg CO2e", color: "text-green-400" },
            { label: "India average (2025)", desc: "regional_emission value from the Climatiq-derived backend calculation", color: "text-amber-400" },
            { label: "Global average", desc: "global_emission for relative world comparison", color: "text-blue-400" },
            { label: "Percentage delta", desc: "difference_percentage shows how far above/below the India 2025 target the user is", color: "text-violet-400" },
          ].map(({ label, desc, color }) => (
            <li key={label} className="flex items-start gap-2 text-sm">
              <span className={`font-mono font-semibold shrink-0 ${color}`}>{label}</span>
              <span className="text-slate-400">— {desc}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-400 mt-2">
          The breakdown section then splits the total into four coloured category tiles, each
          showing the kg value and percentage share, with a "Reduce this score" link to
          category-specific tips pages.
        </p>
      </div>
    ),
  },
  {
    id: "persistence",
    title: "GraphQL Dashboard + AWS Lambda Persistence",
    badge: "Backend",
    content: (
      <div className="space-y-3 text-slate-300 leading-relaxed">
        <p>
          Once submitted, answers are forwarded from
          <span className="text-orange-400 font-mono"> /api/submit</span> to an AWS Lambda
          function via API Gateway. The Lambda saves monthly breakdowns per user, which are
          then queried back by the dashboard using
          <span className="text-purple-400 font-mono"> Apollo Client</span> + GraphQL:
        </p>
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 mt-3 font-mono text-xs text-slate-300 leading-relaxed">
          <p className="text-purple-400 font-semibold mb-2">GetUserCarbonData query returns:</p>
          <p>carbonFootprints[ ]</p>
          <p className="pl-4 text-slate-400">→ month, food, home, shopping, transport, total_emissions</p>
        </div>
        <p className="text-sm text-slate-400 mt-2">
          The dashboard renders this as a time-series chart, letting users track their footprint
          month-over-month and see which categories are trending up or down.
        </p>
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
      // Line comments
      const lc = rest.match(/^(\/\/.*)$/);
      if (lc) { push(lc[1], "text-slate-500 italic"); rest = ""; continue; }
      // Template literals
      const tl = rest.match(/^(`[^`]*`)/);
      if (tl) { push(tl[1], "text-amber-300"); rest = rest.slice(tl[1].length); continue; }
      // Strings
      const str = rest.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if (str) { push(str[1], "text-amber-300"); rest = rest.slice(str[1].length); continue; }
      // JSX elements
      const jsx = rest.match(/^(<\/?[A-Z][A-Za-z]*|<\/?[a-z]+)/);
      if (jsx) { push(jsx[1], "text-red-400"); rest = rest.slice(jsx[1].length); continue; }
      // Keywords
      const kw = rest.match(/^(export|async|function|const|let|var|return|if|else|await|import|from|new|true|false|null|undefined|type|interface|enum|extends|class|default|for|of|in|try|catch)\b/);
      if (kw) { push(kw[1], "text-purple-400 font-semibold"); rest = rest.slice(kw[1].length); continue; }
      // Types
      const type = rest.match(/^(NextRequest|NextResponse|FC|Promise|string|number|boolean|void|any|Response|Request|URL|Box|Typography|Grid|Item|Button|Chip)\b/);
      if (type) { push(type[1], "text-cyan-400"); rest = rest.slice(type[1].length); continue; }
      // Numbers
      const num = rest.match(/^(\d[\d_]*)/);
      if (num) { push(num[1], "text-orange-300"); rest = rest.slice(num[1].length); continue; }
      // Function calls
      const fn = rest.match(/^([a-zA-Z_]\w*)\s*(?=\()/);
      if (fn) { push(fn[1], "text-yellow-300"); rest = rest.slice(fn[1].length); continue; }
      // Identifiers
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
    icon: Leaf,
    label: "Questionnaire",
    value: "4-Section Flow",
    sub: "Food · Travel · Home · Shopping",
    color: "text-green-400",
    border: "border-green-500/20",
    bg: "bg-green-500/5",
  },
  {
    icon: Cloud,
    label: "Emission Data",
    value: "Climatiq API",
    sub: "Real CO2e factors",
    color: "text-sky-400",
    border: "border-sky-500/20",
    bg: "bg-sky-500/5",
  },
  {
    icon: BarChart2,
    label: "Visualization",
    value: "MUI X DataGrid",
    sub: "Nested activity explorer",
    color: "text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
  },
  {
    icon: Database,
    label: "Backend",
    value: "GraphQL + Lambda",
    sub: "Monthly history via Apollo",
    color: "text-orange-400",
    border: "border-orange-500/20",
    bg: "bg-orange-500/5",
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

export default function CarbonFootprintDetail() {
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
              href="https://github.com/isandeep4/CarbonFootprint_Visualization"
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
              {["Next.js", "TypeScript", "MUI v7", "Climatiq API", "GraphQL", "AWS Lambda"].map((tag) => (
                <span key={tag} className="text-xs font-mono px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800/60 text-slate-400">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight" data-testid="text-project-title">
              Carbon Footprint
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400">
                Calculator & Visualizer
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              A full-stack Next.js application that guides users through a dynamic
              multi-section questionnaire to calculate their personal carbon footprint.
              Real emission factors come from the Climatiq API. Results are compared against
              India and global averages, saved to AWS Lambda, and visualised as monthly
              history via a GraphQL-powered dashboard.
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
            The questionnaire runs entirely client-side via React Context, minimising round-trips.
            Next.js API routes proxy the Climatiq API server-side to keep credentials safe.
            On completion, answers are forwarded to an AWS Lambda endpoint and stored per user.
            The dashboard pulls historical data back via Apollo Client + GraphQL.
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
              <span className="text-slate-200 font-mono">/api/climatiq</span> — Next.js server-side
              proxy for the Climatiq emission factor database. Filters are composed dynamically
              from query params so the client never needs to know about the API key or base URL.
            </p>
            <CodeBlock code={CLIMATIQ_CODE} filename="app/api/climatiq/route.ts" lang="TypeScript" />
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
              <span className="text-slate-200 font-mono">Breakdown</span> — the result page
              component that splits the total footprint across four categories. Each tile calculates
              its percentage share as{" "}
              <span className="text-slate-200 font-mono">Math.round((category / total) * 100)</span>{" "}
              and links to a category-specific tips page.
            </p>
            <CodeBlock code={BREAKDOWN_CODE} filename="app/calculator/result/breakdown.tsx" lang="TypeScript" />
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
              The GraphQL query
              <span className="text-slate-200 font-mono"> GetUserCarbonData</span> fetches
              per-month breakdowns for the dashboard. The submit API route forwards the completed
              questionnaire payload to an AWS Lambda function via API Gateway — keeping backend
              logic fully serverless.
            </p>
            <CodeBlock code={GRAPHQL_CODE} filename="graphql/queries + api/submit/route.ts" lang="TypeScript" />
          </div>
        </motion.section>

      </main>

      <footer className="border-t border-slate-800 mt-24 py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm text-slate-600 font-mono">isandeep4 / CarbonFootprint_Visualization</span>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors" data-testid="link-footer-back">
            Back to Portfolio
          </Link>
        </div>
      </footer>
    </div>
  );
}
