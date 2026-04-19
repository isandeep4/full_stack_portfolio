import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Skills } from "@/components/Skills";
import { GitHubProjects } from "@/components/GitHubProjects";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full bg-grid-pattern relative">
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <Navbar />

      <main className="relative z-10 pt-16">
        <Hero />
        <About />
        <Skills />
        <GitHubProjects />
      </main>

      <Footer />
    </div>
  );
}
