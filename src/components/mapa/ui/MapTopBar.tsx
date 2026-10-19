/**
 * MapTopBar — barra superior do mapa.
 */
import { Settings2, Maximize2, Minimize2, Layers, Undo2, Redo2, Swords, Lightbulb, Dices, HelpCircle } from 'lucide-react';
import { RadioIconButton } from './RadioIconButton';
import { useMapStore } from '@/stores/useMapStore';
import { useDiceStore } from '@/stores/useDiceStore';
import { SceneTabs } from './SceneTabs';
import { BackgroundButton } from './BackgroundButton';
import { SceneIOButtons } from './SceneIOButtons';

interface Props {
  immersive: boolean;
  settingsOpen: boolean;
  layerPanelOpen: boolean;
  onToggleSettings: () => void;
  onToggleImmersive: () => void;
  onToggleLayerPanel: () => void;
  onOpenHelp?: () => void;
}

export function MapTopBar({
  immersive,
  settingsOpen,
  layerPanelOpen,
  onToggleSettings,
  onToggleImmersive,
  onToggleLayerPanel,
  onOpenHelp,
}: Props) {
  const undo = useMapStore((s) => s.undo);
  const redo = useMapStore((s) => s.redo);
  const canUndo = useMapStore((s) => s._undo.length > 0);
  const canRedo = useMapStore((s) => s._redo.length > 0);
  const initiativeOpen = useMapStore((s) => s.initiativeOpen);
  const setInitiativeOpen = useMapStore((s) => s.setInitiativeOpen);
  const lightingEnabled = useMapStore((s) => s.lighting.enabled);
  const setLighting = useMapStore((s) => s.setLighting);
  const diceOpen = useDiceStore((s) => s.open);
  const setDiceOpen = useDiceStore((s) => s.setOpen);
  return (
    <div
      className="h-12 min-w-0 shrink-0 flex items-center overflow-x-auto overscroll-x-contain touch-pan-x px-2 gap-2 bg-card border-b border-border text-foreground [scrollbar-width:thin]"
    >
      <div className="min-w-0 flex-1 overflow-hidden" style={{ minWidth: 'min(12rem, 35vw)' }}><SceneTabs /></div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <BackgroundButton />
        <SceneIOButtons />
        <RadioIconButton
          variant="ghost"
          title="Desfazer (Ctrl+Z)"
          label="Desfazer"
          active={false}
          onClick={() => canUndo && undo()}
        >
          <Undo2 className={`h-4 w-4 ${canUndo ? '' : 'opacity-30'}`} />
        </RadioIconButton>
        <RadioIconButton
          variant="ghost"
          title="Refazer (Ctrl+Shift+Z)"
          label="Refazer"
          active={false}
          onClick={() => canRedo && redo()}
        >
          <Redo2 className={`h-4 w-4 ${canRedo ? '' : 'opacity-30'}`} />
        </RadioIconButton>
        <RadioIconButton
          variant="ghost"
          title="Iniciativa (I)"
          label="Iniciativa"
          active={initiativeOpen}
          onClick={() => setInitiativeOpen(!initiativeOpen)}
        >
          <Swords className="h-4 w-4" />
        </RadioIconButton>
        <RadioIconButton
          variant="ghost"
          title={lightingEnabled ? 'Iluminação dinâmica: ligada' : 'Iluminação dinâmica: desligada'}
          label="Iluminação"
          active={lightingEnabled}
          onClick={() => setLighting({ enabled: !lightingEnabled })}
        >
          <Lightbulb className="h-4 w-4" />
        </RadioIconButton>
        <RadioIconButton
          variant="ghost"
          title="Dados (D)"
          label="Dados"
          active={diceOpen}
          onClick={() => setDiceOpen(!diceOpen)}
        >
          <Dices className="h-4 w-4" />
        </RadioIconButton>
        <RadioIconButton
          variant="ghost"
          title="Camadas (L)"
          label="Camadas"
          active={layerPanelOpen}
          onClick={onToggleLayerPanel}
        >
          <Layers className="h-4 w-4" />
        </RadioIconButton>
        <RadioIconButton
          variant="ghost"
          title="Configurações de grade"
          label="Grade"
          active={settingsOpen}
          onClick={onToggleSettings}
        >
          <Settings2 className="h-4 w-4" />
        </RadioIconButton>
        <RadioIconButton
          variant="ghost"
          title="Ajuda / atalhos (?)"
          label="Ajuda"
          active={false}
          onClick={() => onOpenHelp?.()}
        >
          <HelpCircle className="h-4 w-4" />
        </RadioIconButton>
        <RadioIconButton
          variant="ghost"
          title={immersive ? 'Sair do modo imersivo' : 'Modo imersivo'}
          label={immersive ? 'Sair' : 'Imersivo'}
          active={immersive}
          onClick={onToggleImmersive}
        >
          {immersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </RadioIconButton>
      </div>
    </div>
  );
}
