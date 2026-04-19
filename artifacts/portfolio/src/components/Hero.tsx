import { motion } from "framer-motion";
import { Github, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface GitHubProfile {
  avatar_url: string;
  bio: string;
  name: string;
  login: string;
  followers: number;
  following: number;
  public_repos: number;
  html_url: string;
}

export function Hero() {
  const { data: profile, isLoading } = useQuery<GitHubProfile>({
    queryKey: ["github-profile", "isandeep4"],
    queryFn: async () => {
      const res = await fetch("https://api.github.com/users/isandeep4");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  return (
    <section id="home" className="relative min-h-[90vh] flex flex-col justify-center pt-12 pb-32">
      <div className="max-w-4xl mx-auto w-full px-6 md:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col md:flex-row gap-12 items-start md:items-center"
        >
          {/* Avatar Area */}
          <div className="relative shrink-0 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-muted rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative h-32 w-32 md:h-48 md:w-48 rounded-2xl overflow-hidden border-2 border-border bg-card">
              {isLoading || !profile ? (
                <div className="w-full h-full bg-muted animate-pulse" />
              ) : (
                <img
                  src={profile.avatar_url}
                  alt={profile.name || profile.login}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  data-testid="img-avatar"
                />
              )}
            </div>
            {!isLoading && profile && (
              <div className="absolute -bottom-4 -right-4 bg-card border border-border px-3 py-1.5 rounded-lg text-xs font-mono font-medium shadow-sm flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Available
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center gap-3 text-muted-foreground font-mono text-sm"
              >
                <span>Software Engineer</span>
                <span className="w-8 h-px bg-border"></span>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-4xl md:text-6xl font-bold tracking-tight text-foreground"
                data-testid="text-username"
              >
                {isLoading ? "Sandeep" : profile?.name || "Sandeep"}
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
            >
              {profile?.bio || "Building elegant, high-performance web applications with precision and purpose. Focused on clean code and exceptional user experiences."}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap items-center gap-4 pt-4"
            >
              <a
                href={profile?.html_url || "https://github.com/isandeep4"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                data-testid="link-github-hero"
              >
                <Github className="h-5 w-5" />
                <span>GitHub</span>
              </a>
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors group"
                data-testid="link-contact-hero"
              >
                <span>Get in touch</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

            {!isLoading && profile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex items-center gap-6 pt-6 text-sm font-mono text-muted-foreground border-t border-border mt-8"
              >
                <div className="flex flex-col">
                  <span className="text-foreground font-bold text-lg">{profile.public_repos}</span>
                  <span>Repositories</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground font-bold text-lg">{profile.followers}</span>
                  <span>Followers</span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
