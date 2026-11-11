import Image from "next/image";
import Link from "next/link";
import { home } from "@/lib/home";
import { getPosts } from "@/lib/blog";
import { formatDate } from "@/lib/blog-shared";
import { getQuiz } from "@/lib/quiz";
import { PostCard } from "@/components/PostCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SugestaoDrop } from "@/components/SugestaoDrop";
import { Vitrine } from "@/components/Vitrine";
import { Personalize } from "@/components/Personalize";
import { Planeta } from "@/components/Logo";

// Até quatro artes de resultado do quiz em destaque, para o painel ao lado do convite.
function artesDoQuiz(slug: string): string[] {
  const q = getQuiz(slug);
  if (!q || !("results" in q)) return [];
  return Object.values(q.results).flatMap((r) => (r.image ? [r.image] : [])).slice(0, 4);
}

const ESTRELA = "M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z";

function Estrela({ size = 14, acesa = true }: { size?: number; acesa?: boolean }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path d={ESTRELA} fill={acesa ? "currentColor" : "none"} stroke={acesa ? "none" : "currentColor"} strokeWidth="1.2" />
    </svg>
  );
}

function Cabecalho({ etiqueta, titulo, id, children }: { etiqueta: string; titulo: string; id: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2.5">
        <span className="etiqueta text-laranja-claro">{etiqueta}</span>
        <h2 id={id} className="h2">{titulo}</h2>
      </div>
      {children}
    </div>
  );
}

const secao = "relative px-6 pb-[clamp(64px,8vw,104px)]";

export default function Home() {
  const posts = getPosts().slice(0, 3);
  const { hero, diario, challenge, quiz, store, custom } = home;
  const artes = artesDoQuiz(quiz.slug);
  const missaoAberta = Boolean(challenge.theme);

  return (
    <>
      {/* Topo */}
      <section className="relative px-6 pb-[clamp(56px,8vw,104px)] pt-[clamp(48px,7vw,88px)]">
        <div className="miolo entrar grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-center gap-14">
          <div className="flex min-w-0 flex-col gap-6">
            <span className="etiqueta text-laranja-claro">{hero.eyebrow}</span>
            <h1 className="font-semibold leading-[1.02] tracking-[-0.025em]" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
              {hero.title}
            </h1>
            <p className="max-w-[520px] text-[clamp(1.0625rem,1.5vw,1.125rem)] leading-[1.55] text-areia">{hero.text}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/cadastro" className="btn bg-laranja !px-[22px] !py-3.5 !text-base text-noite">Criar minha cabine</Link>
              <Link href="/quiz" className="btn btn-fantasma !px-[22px] !py-[13px] !text-base">Fazer um quiz</Link>
            </div>
            <ul className="mt-2 flex list-none flex-wrap gap-x-7 gap-y-3 border-t border-creme/15 p-0 pt-5 text-[15px] text-areia">
              {hero.steps.map((s) => (
                <li key={s} className="flex items-center gap-2 text-laranja-claro">
                  <Estrela />
                  <span className="text-areia">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Janela + prévia da cabine */}
          <div className="relative flex min-h-[420px] min-w-0 items-start justify-end sm:min-h-[480px]">
            <div className="aspect-square w-[min(400px,88%)] rounded-full bg-creme p-[5.5%] shadow-[0_20px_60px_rgb(0_0_0/0.4)]">
              <svg viewBox="0 0 356 356" role="img" aria-label="Janela redonda de uma cabine espacial, com um planeta laranja e estrelas" className="block size-full rounded-full bg-cabine">
                <g fill="#ece3be">
                  <circle cx="70" cy="90" r="1.5" opacity="0.7" /><circle cx="270" cy="70" r="1.5" opacity="0.6" />
                  <circle cx="300" cy="220" r="1.5" opacity="0.8" /><circle cx="110" cy="280" r="1.5" opacity="0.6" />
                </g>
                <path d="M96 96C97 108 101 112 113 113C101 114 97 118 96 130C95 118 91 114 79 113C91 112 95 108 96 96Z" fill="#f2a66e" />
                <circle cx="190" cy="186" r="70" fill="#dd5d05" />
                <path d="M126 170 Q190 150 254 165" stroke="#ab392f" strokeWidth="9" fill="none" strokeLinecap="round" />
                <path d="M130 205 Q190 190 250 200" stroke="#f2a66e" strokeWidth="6" fill="none" strokeLinecap="round" />
                <ellipse cx="190" cy="186" rx="118" ry="30" fill="none" stroke="#ece3be" strokeWidth="3" transform="rotate(-12 190 186)" />
              </svg>
            </div>

            <div aria-label="Exemplo de cabine" className="absolute bottom-0 left-0 flex w-[min(320px,92%)] flex-col gap-3.5 rounded-lg bg-creme-claro p-5 text-noite shadow-duro">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cabine"><Planeta size={30} /></span>
                <span className="flex flex-col">
                  <span className="etiqueta !text-[11px] text-azul">A cabine de</span>
                  <span className="text-lg font-semibold">@você</span>
                </span>
              </div>
              <div className="rounded-md bg-creme px-3.5 py-3">
                <span className="etiqueta !text-[11px] text-azul">Seu resultado no quiz</span>
                <p className="mt-1 text-[22px] font-bold tracking-[-0.015em] text-azul">Quem você é</p>
              </div>
              <div>
                <span className="etiqueta mb-2 block !text-[11px] text-azul">Na sua estante</span>
                <div className="flex flex-wrap gap-1.5">
                  {hero.shelf.map((s) => <span key={s} className="rounded bg-creme px-2.5 py-1 text-[13px] font-medium">{s}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiz em destaque */}
      <section id="quiz" aria-labelledby="quiz-titulo" className={secao}>
        <div className="painel miolo surge grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] overflow-hidden">
          <div className="flex min-w-0 flex-col justify-center gap-4 p-[clamp(24px,4vw,48px)]">
            <span className="etiqueta text-azul">Quiz em destaque</span>
            <h2 id="quiz-titulo" className="font-semibold leading-[1.05] tracking-[-0.015em] text-azul" style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.75rem)" }}>
              {quiz.title}
            </h2>
            <p className="max-w-[440px] text-base leading-[1.55] text-tinta">{quiz.text}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/quiz/${quiz.slug}`} className="btn bg-laranja text-noite">Começar o quiz</Link>
              <Link href="/quiz" className="btn btn-contorno">Ver todos os quizzes</Link>
            </div>
          </div>
          <div className="grid min-h-[300px] grid-cols-2 bg-azul">
            {artes.length > 0 ? (
              artes.map((src) => (
                <div key={src} className={`relative ${artes.length < 3 ? "row-span-2" : ""} ${artes.length === 1 ? "col-span-2" : ""}`}>
                  <Image src={src} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-2 flex items-center justify-center"><Planeta size={96} /></div>
            )}
          </div>
        </div>
      </section>

      {/* Diário de Bordo */}
      <section id="diario" aria-labelledby="diario-titulo" className={secao}>
        <div className="card miolo surge grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-center gap-10 p-[clamp(20px,3.4vw,40px)]">
          <div className="flex flex-col gap-4">
            <span className="etiqueta text-laranja-claro">{diario.eyebrow}</span>
            <h2 id="diario-titulo" className="h2">{diario.title}</h2>
            <p className="max-w-[460px] text-base leading-[1.55] text-areia">{diario.text}</p>
            <ul className="flex list-none flex-wrap gap-2 p-0">
              {diario.features.map((f) => <li key={f} className="rounded border border-creme/40 px-2.5 py-1.5 text-sm">{f}</li>)}
            </ul>
            <Link href="/diario" className="btn mt-1 self-start bg-laranja text-noite">Abrir meu diário</Link>
          </div>
          <div className="painel flex flex-col gap-4 p-6" aria-label="Exemplo de um dia no diário">
            <div className="flex items-baseline justify-between">
              <span className="etiqueta !text-[11px] text-azul">Hoje · Quests</span>
              <span className="font-ficha text-xs text-[#4a4a4a]">exemplo</span>
            </div>
            <ul className="flex list-none flex-col gap-2.5 p-0 text-[15px]">
              {diario.example.map((q) => (
                <li key={q.text} className="flex items-center gap-2.5">
                  <span aria-hidden="true" className={`size-[18px] shrink-0 rounded ${q.done ? "bg-azul" : "border-[1.5px] border-noite"}`} />
                  <span className={q.done ? "text-[#4a4a4a] line-through" : ""}>{q.text}</span>
                  {q.urgent && <span className="rounded bg-creme px-1.5 py-0.5 font-ficha text-[11px] text-azul">URGENTE</span>}
                </li>
              ))}
            </ul>
            <div className="border-t border-creme pt-3.5">
              <span className="etiqueta mb-2 block !text-[11px] text-azul">Estrelas do mês</span>
              <div className="flex gap-1.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className={i < 4 ? "text-laranja" : "text-azul"}><Estrela size={22} acesa={i < 4} /></span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loja */}
      <section id="loja" aria-labelledby="loja-titulo" className="relative px-6 pb-16">
        <div className="miolo surge flex flex-col gap-6">
          <Cabecalho etiqueta={store.eyebrow} titulo={store.title} id="loja-titulo">
            <Link href="/colecoes" className="link-ficha py-3">Ver a loja →</Link>
          </Cabecalho>
          <p className="-mt-3 text-base text-areia">{store.text}</p>

          <Link href="/colecoes" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] overflow-hidden rounded-lg border border-creme/15 bg-black text-creme no-underline">
            <div className="relative aspect-[2/1]">
              <Image src={store.launch.image} alt={store.launch.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-col justify-center gap-3 bg-cabine p-8">
              <span className="etiqueta text-laranja-claro">Lançamento</span>
              <span className="text-[30px] font-semibold leading-[1.1] tracking-[-0.015em]">{store.launch.name}</span>
              <span className="text-[15px] text-areia">{store.launch.text}</span>
              <span className="btn self-start bg-laranja text-noite">Quero a minha</span>
            </div>
          </Link>

          <Vitrine produtos={store.products} />
        </div>
      </section>

      {/* Personalize */}
      <section id="personalize" aria-labelledby="personalize-titulo" className={secao}>
        <div className="miolo surge">
          <Personalize pecas={custom.pieces} passos={custom.steps} />
        </div>
      </section>

      {/* Comunidade */}
      <section id="comunidade" aria-labelledby="comunidade-titulo" className={secao}>
        <div className="miolo surge flex flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <span className="etiqueta text-laranja-claro">Comunidade</span>
            <h2 id="comunidade-titulo" className="h2">A próxima peça sai daqui.</h2>
            <p className="max-w-[620px] text-base text-areia">Você cria na missão do mês ou sugere o tema do próximo drop. A galera vota e a mais votada vira produto, com o nome de quem criou.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-stretch gap-4">
            <div id="desafio" className="card flex flex-col gap-5 p-7">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[22px] font-semibold">{missaoAberta ? `Missão de ${challenge.month}` : "Missão do mês"}</h3>
                <span className="etiqueta rounded bg-laranja-claro px-2 py-1 !text-[11px] text-noite">{missaoAberta ? "Aberta" : "Abre em breve"}</span>
              </div>
              {missaoAberta && <p className="text-[2rem] font-semibold leading-none tracking-[-0.02em]">{challenge.theme}</p>}
              <ol className="flex list-none flex-col gap-3.5 p-0 text-base">
                {challenge.steps.map((s, i) => (
                  <li key={s} className="flex gap-3.5">
                    <span className="pt-0.5 font-ficha text-[13px] text-laranja-claro">{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-auto flex flex-col gap-3 border-t border-creme/15 pt-5">
                {missaoAberta ? (
                  <p className="text-[15px] text-areia">Encerra em {challenge.endsAt}.</p>
                ) : (
                  <p className="text-[15px] text-areia">A primeira missão ainda não foi lançada. Quer saber quando abrir?</p>
                )}
                <a href="#newsletter" className="btn self-start bg-laranja text-noite">Me avisa quando abrir</a>
              </div>
            </div>
            <SugestaoDrop />
          </div>
        </div>
      </section>

      {/* Blog */}
      {posts.length > 0 && (
        <section id="blog" aria-labelledby="blog-titulo" className={secao}>
          <div className="miolo surge flex flex-col gap-7">
            <Cabecalho etiqueta="Transmissões da base" titulo="No blog" id="blog-titulo">
              <Link href="/blog" className="link-ficha py-3">Ver todos os posts →</Link>
            </Cabecalho>
            {posts.length < 3 ? (
              posts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="card grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] overflow-hidden text-creme no-underline hover:border-creme/40">
                  <div className="relative min-h-[260px] bg-cabine">
                    <Image src={p.cover} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized={p.cover.endsWith(".svg")} />
                  </div>
                  <div className="flex flex-col justify-center gap-3 p-[clamp(20px,3vw,36px)]">
                    <span className="etiqueta text-laranja-claro">{p.category} · {formatDate(p.date)}</span>
                    <h3 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.015em]">{p.title}</h3>
                    <p className="text-base leading-[1.55] text-areia">{p.excerpt}</p>
                    <span className="mt-1 font-ficha text-xs text-areia">{p.readingTime} MIN DE LEITURA · LER O POST →</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {posts.map((p) => <PostCard key={p.slug} post={p} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section id="newsletter" aria-labelledby="news-titulo" className="relative px-6 pb-16">
        <div className="painel miolo surge flex flex-wrap items-center gap-8 px-[clamp(24px,4vw,48px)] py-[clamp(24px,3.6vw,44px)]">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
            <span className="etiqueta text-azul">Newsletter</span>
            <h2 id="news-titulo" className="text-[clamp(1.5rem,2.8vw,2.125rem)] font-semibold leading-[1.1] tracking-[-0.015em] text-azul">Notícias da base no seu e-mail</h2>
            <p className="text-[15px] leading-normal text-[#4a4a4a]">Quizzes novos, posts, missão do mês e lançamentos da loja. Sem spam, e dá pra sair quando quiser.</p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      {/* Parceiros */}
      <section id="parceiros" aria-labelledby="parceiros-titulo" className="relative px-6 pb-24">
        <div className="miolo surge flex flex-wrap items-center justify-between gap-5 rounded-lg border-[1.5px] border-dashed border-laranja-claro/70 px-7 py-[22px]">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-1">
            <span className="etiqueta text-laranja-claro">Parceiros</span>
            <h2 id="parceiros-titulo" className="text-lg font-semibold">Tem loja, canal ou comunidade? Revenda, indique ou crie peças com a sua marca.</h2>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[15px]">
            <Link href="/parceiros" className="text-laranja-claro hover:text-creme">Revenda</Link>
            <Link href="/parceiros" className="text-laranja-claro hover:text-creme">Afiliados</Link>
            <Link href="/parceiros" className="text-laranja-claro hover:text-creme">Criadores</Link>
            <Link href="/parceiros" className="btn btn-fantasma">Quero ser parceiro</Link>
          </div>
        </div>
      </section>
    </>
  );
}
