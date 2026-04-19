import { motion } from "framer-motion";
import { Star, GitFork, ExternalLink, Code, ArrowRight, Layers, Zap, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface Repository {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Shell: "#89e051",
  Vue: "#41b883",
  Ruby: "#382867",
};

export function GitHubProjects() {
  const { data: repos, isLoading, error } = useQuery<Repository[]>({
    queryKey: ["github-repos", "isandeep4"],
    queryFn: async () => {
      const res = await fetch("https://api.github.com/users/isandeep4/repos?sort=updated&per_page=12");
      if (!res.ok) throw new Error("Failed to fetch repositories");
      return res.json();
    },
  });

  return (
    <section className="py-24 relative" id="projects">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Selected Work</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              A collection of open-source projects, experiments, and contributions. Sorted by recent activity.
            </p>
          </div>
          <a 
            href="https://github.com/isandeep4?tab=repositories" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all on GitHub <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Featured Case Study */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Featured Case Study</p>
          <Link
            href="/project/distributed-cache"
            className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all duration-300 overflow-hidden"
            data-testid="link-featured-project"
          >
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="relative flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                {["Java", "Concurrency", "LRU / LFU", "CompletionStage"].map((tag) => (
                  <span key={tag} className="text-xs font-mono px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                Generic In-Memory Cache System
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl">
                Type-safe, async, thread-safe in-memory cache in Java with pluggable LRU/LFU eviction, configurable TTL, write-through/write-back persistence, and key-sharded thread pools.
              </p>
              <div className="flex flex-wrap items-center gap-5 pt-1">
                {[
                  { icon: Layers, label: "LRU + LFU eviction", color: "text-amber-500" },
                  { icon: Zap, label: "Async CompletionStage", color: "text-blue-500" },
                  { icon: ShieldCheck, label: "Thread-safe by design", color: "text-violet-500" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative shrink-0 flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
              <span>View Case Study</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* GitHub repos heading */}
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6">Open Source Repositories</p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-1/2 h-6 bg-muted animate-pulse rounded" />
                  <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                </div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-muted animate-pulse rounded" />
                  <div className="w-4/5 h-4 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex gap-4 pt-4 mt-auto">
                  <div className="w-16 h-4 bg-muted animate-pulse rounded" />
                  <div className="w-12 h-4 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center border border-destructive/20 bg-destructive/5 rounded-xl">
            <p className="text-destructive">Failed to load repositories. Please try again later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {repos?.filter(repo => !repo.fork).slice(0, 8).map((repo, i) => (
              <motion.a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group flex flex-col p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all hover:shadow-md relative overflow-hidden"
                data-testid={`card-repo-${repo.name}`}
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <h3 className="text-xl font-semibold mb-2 pr-8 group-hover:text-primary transition-colors">
                  {repo.name}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-6 flex-1 line-clamp-2">
                  {repo.description || "No description provided."}
                </p>
                
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mt-auto pt-4 border-t border-border">
                  {repo.language && (
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "#ccc" }}
                      />
                      <span>{repo.language}</span>
                    </div>
                  )}
                  {repo.stargazers_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      <span>{repo.stargazers_count}</span>
                    </div>
                  )}
                  {repo.forks_count > 0 && (
                    <div className="flex items-center gap-1">
                      <GitFork className="h-3.5 w-3.5" />
                      <span>{repo.forks_count}</span>
                    </div>
                  )}
                  {!repo.language && repo.stargazers_count === 0 && repo.forks_count === 0 && (
                    <div className="flex items-center gap-1 opacity-50">
                      <Code className="h-3.5 w-3.5" />
                      <span>Code</span>
                    </div>
                  )}
                </div>
              </motion.a>
            ))}
          </div>
        )}
        
        <div className="mt-8 text-center md:hidden">
          <a 
            href="https://github.com/isandeep4?tab=repositories" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            View all on GitHub <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
