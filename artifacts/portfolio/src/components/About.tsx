import { motion } from "framer-motion";
import { Terminal, Code2, Cpu } from "lucide-react";

export function About() {
  return (
    <section className="py-24 relative" id="about">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">About Me</h2>
          <div className="h-1 w-20 bg-primary rounded-full" />
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="space-y-6 text-lg text-muted-foreground leading-relaxed"
          >
            <p>
              I am a software engineer focused on building robust, scalable applications. I believe in the power of well-structured code and thoughtful architecture to solve complex problems.
            </p>
            <p>
              My approach combines technical precision with an eye for user experience. I don't just write code; I craft solutions that perform beautifully under the hood while providing intuitive interfaces for users.
            </p>
            <p>
              When I'm not pushing commits, I'm usually exploring new tools, contributing to open source, or diving deep into system design patterns.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid gap-6"
          >
            <div className="p-6 rounded-xl border border-border bg-card flex gap-4 hover:border-primary/50 transition-colors duration-300">
              <Terminal className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Architecture First</h3>
                <p className="text-sm text-muted-foreground">Systems designed to scale smoothly and remain maintainable over time.</p>
              </div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card flex gap-4 hover:border-primary/50 transition-colors duration-300">
              <Code2 className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Clean Code</h3>
                <p className="text-sm text-muted-foreground">Writing software that is readable, testable, and robust.</p>
              </div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card flex gap-4 hover:border-primary/50 transition-colors duration-300">
              <Cpu className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Performance</h3>
                <p className="text-sm text-muted-foreground">Optimizing across the stack for lightning-fast user experiences.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
