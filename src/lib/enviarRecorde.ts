import { enviarRecorde } from "@/app/actions/ranking";

// Os jogos chamam isso junto com o localStorage. Falhou? Paciência, o recorde local continua.
export function mandarProRanking(jogo: string, valor: number) {
  enviarRecorde(jogo, valor).catch(() => {});
}
