import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Skills } from "@/components/Skills";
import { GitHubProjects } from "@/components/GitHubProjects";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full bg-grid-pattern relative">
      {/* Subtle top gradient */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <main className="relative z-10">
        <Hero />
        <About />
        <Skills />
        <GitHubProjects />
      </main>
      
      <Footer />
    </div>
  );
}
