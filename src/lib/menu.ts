export type ItemMenu = { label: string; href: string; tambem?: readonly string[]; exato?: boolean };

const dentro = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

// O link fica aceso na própria seção e nas que ele cobre ("tambem").
// "exato" serve pra Base (/conta) não acender junto com a Cabine (/conta/editar).
export function ativo(path: string, item: ItemMenu): boolean {
  if (item.href.includes("#")) return false;
  if (item.exato || item.href === "/") return path === item.href;
  return [item.href, ...(item.tambem ?? [])].some((h) => dentro(path, h));
}
