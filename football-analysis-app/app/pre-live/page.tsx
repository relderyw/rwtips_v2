 "use client"

import { useEffect } from "react"
import { PreLiveMatches } from "@/components/pre-live-matches"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PreLivePage() {
    useEffect(() => {
        if (typeof window === "undefined") return

        const params = new URLSearchParams(window.location.search)
        const devParam = params.get("devMode")
        const devEnabled = devParam === "rw_admin_2026"

        if (devEnabled) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === "F12" ||
                (e.ctrlKey &&
                    e.shiftKey &&
                    (e.key === "I" ||
                        e.key === "i" ||
                        e.key === "J" ||
                        e.key === "j" ||
                        e.key === "C" ||
                        e.key === "c")) ||
                (e.ctrlKey && (e.key === "U" || e.key === "u"))
            ) {
                e.preventDefault()
                e.stopPropagation()
            }
        }

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
        }

        window.addEventListener("keydown", handleKeyDown, true)
        window.addEventListener("contextmenu", handleContextMenu, true)

        return () => {
            window.removeEventListener("keydown", handleKeyDown, true)
            window.removeEventListener("contextmenu", handleContextMenu, true)
        }
    }, [])
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
