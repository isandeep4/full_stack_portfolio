import { motion } from "framer-motion";
import { Github, Mail, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border bg-card mt-24" id="contact">
      <div className="max-w-4xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start">
          <span className="text-xl font-bold tracking-tight">Sandeep.</span>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/isandeep4" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            data-testid="link-footer-github"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a 
            href="mailto:hello@example.com" 
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            data-testid="link-footer-email"
            aria-label="Email"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
