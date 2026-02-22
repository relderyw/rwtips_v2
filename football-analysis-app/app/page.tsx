"use client"

import { useState, useEffect } from "react"
import { UpcomingMatches } from "@/components/upcoming-matches"
import { PreLiveMatches } from "@/components/pre-live-matches"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"live" | "pre-live">("live")

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
          <Link href="/Visualization.html">
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Football Analysis</h1>
            <p className="text-muted-foreground">Analyze upcoming matches and team statistics</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${activeTab === "live"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
          >
            AO VIVO
          </button>
          <button
            onClick={() => setActiveTab("pre-live")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${activeTab === "pre-live"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
          >
            PRÉ-LIVE
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === "live" ? <UpcomingMatches /> : <PreLiveMatches />}
      </div>
    </main>
  )
}
