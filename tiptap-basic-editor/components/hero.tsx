import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

export function Hero() {
  return (
    <section className="py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Build your rich-text editor
          </h1>
          <p className="text-xl">Framework · Plugins · Components</p>
          <div className="flex gap-4 mt-4">
            <Button size="lg" asChild>
              <Link href="https://tiptap-shadcn.vercel.app/" target="_blank" rel="noopener noreferrer" >Goto website</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link  href="https://github.com/ehtisham-afzal/tiptap-shadcn" target="_blank" rel="noopener noreferrer" >Github</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

