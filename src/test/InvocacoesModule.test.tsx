// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Character } from "@/types";
import { useCharacterStore } from "@/stores/useCharacterStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useRoleStore } from "@/stores/useRoleStore";
import { InvocacoesModule } from "@/components/invocacoes/InvocacoesModule";

vi.mock("@/components/fichas/ControladorShikigamisAba", () => ({
  ControladorShikigamisAba: ({ character }: { character: Character }) => (
    <div data-testid="controlador-invocacoes">{character.id}</div>
  ),
}));

const jogador = (id: string, profileId: string) =>
  ({
    id,
    name: id,
    category: "PLAYER",
    createdBy: "PLAYER",
    profileId,
  }) as Character;

describe("módulo independente de Invocações", () => {
  afterEach(() => {
    cleanup();
    useCharacterStore.setState({ characters: [] });
    useProfileStore.setState({ activeProfileId: null });
    useRoleStore.setState({ role: null });
  });

  it("limita o jogador à ficha associada ao perfil atual", async () => {
    useCharacterStore.setState({
      characters: [jogador("controlador-1", "perfil-1"), jogador("controlador-2", "perfil-2")],
    });
    useProfileStore.setState({ activeProfileId: "perfil-1" });
    useRoleStore.setState({ role: "PLAYER" });

    render(<InvocacoesModule />);

    expect((await screen.findByTestId("controlador-invocacoes")).textContent).toBe("controlador-1");
    expect(screen.queryByText("controlador-2")).toBeNull();
    expect(screen.queryByLabelText("Personagem controlador")).toBeNull();
  });

  it("mantém o seletor visível e a ponte nativa sincronizados para o Mestre", () => {
    useCharacterStore.setState({
      characters: [jogador("controlador-1", "perfil-1"), jogador("controlador-2", "perfil-2")],
    });
    useRoleStore.setState({ role: "MASTER" });

    const { container } = render(<InvocacoesModule />);
    expect(screen.getByRole("combobox", { name: "Personagem controlador" }).tagName).toBe("BUTTON");
    const nativeSelect = container.querySelector<HTMLSelectElement>("select.inv-select-native");
    if (!nativeSelect) throw new Error("A ponte nativa do seletor não foi renderizada");
    fireEvent.change(nativeSelect, { target: { value: "controlador-2" } });

    expect(screen.getByTestId("controlador-invocacoes").textContent).toBe("controlador-2");
  });
});
