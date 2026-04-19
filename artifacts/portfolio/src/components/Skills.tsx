import { motion } from "framer-motion";
import { SiTypescript, SiJavascript, SiReact, SiPython, SiGo, SiRust, SiNodedotjs, SiTailwindcss, SiNextdotjs, SiDocker, SiPostgresql, SiMongodb } from "react-icons/si";

const skills = [
  { name: "TypeScript", icon: SiTypescript, color: "#3178c6" },
  { name: "JavaScript", icon: SiJavascript, color: "#f7df1e" },
  { name: "React", icon: SiReact, color: "#61dafb" },
  { name: "Next.js", icon: SiNextdotjs, color: "#000000", darkColor: "#ffffff" },
  { name: "Node.js", icon: SiNodedotjs, color: "#339933" },
  { name: "Python", icon: SiPython, color: "#3776ab" },
  { name: "Go", icon: SiGo, color: "#00add8" },
  { name: "Rust", icon: SiRust, color: "#000000", darkColor: "#dea584" },
  { name: "Tailwind CSS", icon: SiTailwindcss, color: "#06b6d4" },
  { name: "PostgreSQL", icon: SiPostgresql, color: "#336791" },
  { name: "MongoDB", icon: SiMongodb, color: "#47a248" },
  { name: "Docker", icon: SiDocker, color: "#2496ed" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function Skills() {
  return (
    <section className="py-24 relative" id="skills">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Technical Arsenal</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Tools and technologies I use to bring ideas to life. I focus on choosing the right tool for the job, prioritizing performance, maintainability, and developer experience.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          {skills.map((skill) => (
            <motion.div
              key={skill.name}
              variants={item}
              className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors group cursor-default"
              data-testid={`card-skill-${skill.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              <skill.icon 
                className="h-10 w-10 mb-3 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                style={{
                  transition: "color 0.3s ease",
                }}
              />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {skill.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
