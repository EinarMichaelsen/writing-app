import { RichTextEditorDemo } from "@/components/tiptap/rich-text-editor"
import { Hero } from "@/components/hero"
import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <main className="flex-grow container mx-auto px-4 py-8" id="editor">
        <RichTextEditorDemo className="w-full rounded-xl" />
      </main>
      <Footer />
    </div>
  )
}

