import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Edit3, FileText, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex items-center justify-between h-16 mx-auto">
          <div className="flex items-center gap-2 font-semibold">
            <Edit3 className="w-5 h-5" />
            <span>WriteMind</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="inline-flex items-center px-3 py-1 text-sm rounded-full bg-muted">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                <span>AI-powered writing assistant</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                Write better, faster, together with AI
              </h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Revolutionize your writing process with our AI-powered editor that helps you focus on creativity while
                enhancing your workflow.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/editor/new">
                    Start writing <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/examples">
                    <FileText className="w-4 h-4 mr-2" />
                    See examples
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="py-12 border-t bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold">AI-Powered Assistance</h3>
                <p className="text-muted-foreground">
                  Get intelligent suggestions, completions, and edits as you write, helping you craft your best work.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold">Version History</h3>
                <p className="text-muted-foreground">
                  Compare different versions of your text and easily roll back to previous iterations at the paragraph
                  level.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold">Context-Aware</h3>
                <p className="text-muted-foreground">
                  Upload your previous writings and reference materials to personalize the AI to your unique style and
                  needs.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-sm text-muted-foreground">© 2025 WriteMind. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

