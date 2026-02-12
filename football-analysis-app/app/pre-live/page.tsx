import { PreLiveMatches } from "@/components/pre-live-matches"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PreLivePage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-4">
                    <Link href="/">
                        <Button variant="outline">← Voltar</Button>
                    </Link>
                </div>
                <div className="mb-8 flex items-center gap-4">
                    <img
                        src="https://i.ibb.co/G4Y8sHMk/Chat-GPT-Image-21-de-abr-de-2025-16-14-34-1.png"
                        alt="Logo"
                        className="h-16 w-auto object-contain"
                    />
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Football Analysis - Pré-Live</h1>
                        <p className="text-muted-foreground">Analise jogos futuros e prepare suas estratégias</p>
                    </div>
                </div>
                <PreLiveMatches />
            </div>
        </main>
    )
}
