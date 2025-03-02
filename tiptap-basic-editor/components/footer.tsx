export function Footer() {
  return (
    <footer className="border-grid border-t py-6 md:px-8 md:py-0 w-full">
      <div className="container-wrapper">
        <div className="container py-4">
          <div className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href="https://ehtisham.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Ehtisham Afzal
            </a>{" "}
          </div>
        </div>
      </div>
    </footer>
  )
}

