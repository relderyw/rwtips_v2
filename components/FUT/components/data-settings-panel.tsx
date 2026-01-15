"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type { DataSettings } from "@/components/match-analysis"

interface DataSettingsPanelProps {
  settings: DataSettings
  onSettingsChange: (settings: DataSettings) => void
}

export function DataSettingsPanel({ settings, onSettingsChange }: DataSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Configuração de Dados</h3>
        <p className="text-sm text-muted-foreground mb-6">Configure quais partidas incluir na análise estatística</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="matches-slider" className="text-sm font-medium">
              Número de Partidas Recentes
            </Label>
            <span className="text-sm font-semibold text-primary">{settings.numberOfMatches}</span>
          </div>
          <Slider
            id="matches-slider"
            min={5}
            max={20}
            step={1}
            value={[settings.numberOfMatches]}
            onValueChange={(value) =>
              onSettingsChange({
                ...settings,
                numberOfMatches: value[0],
              })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">Analisar as últimas {settings.numberOfMatches} partidas</p>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border">
          <div className="space-y-1">
            <Label htmlFor="include-home" className="text-sm font-medium">
              Incluir Jogos em Casa
            </Label>
            <p className="text-xs text-muted-foreground">Incluir partidas jogadas em casa</p>
          </div>
          <Switch
            id="include-home"
            checked={settings.includeHome}
            onCheckedChange={(checked) =>
              onSettingsChange({
                ...settings,
                includeHome: checked,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border">
          <div className="space-y-1">
            <Label htmlFor="include-away" className="text-sm font-medium">
              Incluir Jogos Fora
            </Label>
            <p className="text-xs text-muted-foreground">Incluir partidas jogadas fora de casa</p>
          </div>
          <Switch
            id="include-away"
            checked={settings.includeAway}
            onCheckedChange={(checked) =>
              onSettingsChange({
                ...settings,
                includeAway: checked,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border">
          <div className="space-y-1">
            <Label htmlFor="same-competition" className="text-sm font-medium">
              Apenas Mesma Competição
            </Label>
            <p className="text-xs text-muted-foreground">Analisar apenas partidas do mesmo torneio</p>
          </div>
          <Switch
            id="same-competition"
            checked={settings.sameCompetition}
            onCheckedChange={(checked) =>
              onSettingsChange({
                ...settings,
                sameCompetition: checked,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
