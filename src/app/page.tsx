import Image from "next/image";
import Link from "next/link";
import { home } from "@/lib/home";
import { getPosts } from "@/lib/blog";
import { getQuiz } from "@/lib/quiz";
import { PostCard } from "@/components/PostCard";
import { Ph } from "@/components/Ph";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SugestaoDrop } from "@/components/SugestaoDrop";
import { Planeta } from "@/components/Logo";

// Até quatro artes de resultado do quiz em destaque, para o painel ao lado do convite.
function artesDoQuiz(slug: string): string[] {
  const q = getQuiz(slug);
  if (!q || !("results" in q)) return [];
  return Object.values(q.results).flatMap((r) => (r.image ? [r.image] : [])).slice(0, 4);
}

function Cabecalho({ etiqueta, titulo, id, children }: { etiqueta: string; titulo: string; id: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-2">
        <span className="etiqueta text-laranja-claro">{etiqueta}</span>
        <h2 id={id} className="h2">{titulo}</h2>
      </div>
      {children}
    </div>
  );
}

export default function Home() {
  const posts = getPosts().slice(0, 3);
  const { hero, howItWorks, diario, challenge, quiz, store, partners, newsletter } = home;
  const artes = artesDoQuiz(quiz.slug);

  return (
    <>
      {/* Topo */}
      <section className="relative px-6 pb-[clamp(56px,8vw,112px)] pt-[clamp(48px,7vw,96px)]">
        <div className="miolo flex flex-wrap items-center gap-12">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[22px]">
            <span className="etiqueta text-[13px] text-laranja-claro">{hero.eyebrow}</span>
            <h1 className="font-semibold leading-[1.02] tracking-[-0.025em]" style={{ fontSize: "clamp(2.5rem, 6vw, 4.75rem)" }}>
              {hero.title}
            </h1>
            <p className="max-w-[540px] text-[clamp(1.0625rem,1.5vw,1.25rem)] leading-[1.55] text-areia">{hero.text}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/cadastro" className="btn bg-laranja !px-[22px] !py-4 !text-[17px] text-noite">Criar minha cabine</Link>
              <Link href="/quiz" className="btn btn-fantasma !px-[22px] !py-[15px] !text-[17px]">Fazer um quiz</Link>
            </div>
          </div>

          <div className="relative flex min-w-0 flex-[1_1_380px] justify-center pb-[30px] pt-2.5">
            <div className="aspect-square w-[min(380px,86%)] rounded-full bg-creme p-[5%] shadow-duro-lg">
              <svg viewBox="0 0 300 300" role="img" aria-label="Janela redonda de uma cabine espacial, com um planeta laranja e estrelas" className="block size-full rounded-full">
                <rect width="300" height="300" fill="#072f5c" />
                <g fill="#ece3be">
                  <circle cx="50" cy="60" r="1.6" /><circle cx="230" cy="44" r="1.3" /><circle cx="262" cy="200" r="1.6" />
                  <circle cx="64" cy="236" r="1.2" /><circle cx="160" cy="30" r="1" /><circle cx="110" cy="270" r="1" />
                </g>
                <circle cx="166" cy="166" r="70" fill="#dd5d05" />
                <path d="M114 150 C140 140 186 142 218 160" stroke="#ab392f" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.7" />
                <path d="M106 184 C144 174 186 180 222 194" stroke="#f2a66e" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.8" />
                <ellipse cx="166" cy="166" rx="116" ry="28" fill="none" stroke="#ece3be" strokeWidth="3" transform="rotate(-16 166 166)" />
                <path d="M70 92 C72 104 75 107 87 109 C75 111 72 114 70 126 C68 114 65 111 53 109 C65 107 68 104 70 92Z" fill="#f2a66e" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 flex max-w-[250px] items-center gap-2.5 rounded-lg bg-creme-claro px-3.5 py-3 text-noite shadow-duro">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cabine">
                <Planeta size={28} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-ficha text-[9px] tracking-[0.12em] text-azul">A CABINE DE</span>
                <span className="text-[15px] font-semibold">@você</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section aria-labelledby="como" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
        <div className="miolo flex flex-col gap-7">
          <Cabecalho etiqueta="Como funciona" titulo="Três coisas que você faz na base" id="como" />
          <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-0">
            {howItWorks.map((s, i) => (
              <li key={s.title} className="card flex flex-col gap-2.5 p-[22px]">
                <span className="font-ficha text-[13px] text-laranja-claro">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[21px] font-semibold">{s.title}</h3>
                <p className="text-[15px] leading-[1.55] text-areia">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Diário de Bordo */}
      <section id="diario" aria-labelledby="diario-titulo" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
        <div className="miolo flex flex-col gap-6">
          <Cabecalho etiqueta={diario.eyebrow} titulo={diario.title} id="diario-titulo">
            <Link href="/diario" className="btn bg-laranja text-noite">Abrir meu diário</Link>
          </Cabecalho>
          <p className="-mt-2 max-w-[640px] text-[15px] leading-[1.55] text-areia">{diario.text}</p>
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 p-0">
            {diario.features.map((f, i) => (
              <li key={f.title} className="card flex flex-col gap-2 p-5">
                <span className="font-ficha text-[13px] text-laranja-claro">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[18px] font-semibold">{f.title}</h3>
                <p className="text-sm leading-normal text-areia">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Quiz em destaque */}
      <section id="quiz" aria-labelledby="quiz-titulo" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
        <div className="painel miolo flex flex-wrap overflow-hidden !shadow-none">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5 p-[clamp(24px,4vw,48px)]">
            <span className="etiqueta text-azul">Quiz em destaque</span>
            <h2 id="quiz-titulo" className="font-bold leading-[1.05] tracking-[-0.02em] text-azul" style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.75rem)" }}>
              {quiz.title}
            </h2>
            <p className="max-w-[460px] text-base leading-[1.55] text-tinta">{quiz.text}</p>
            <div className="flex flex-wrap gap-3 pt-1.5">
              <Link href={`/quiz/${quiz.slug}`} className="btn bg-laranja text-noite">Começar o quiz</Link>
              <Link href="/quiz" className="btn btn-contorno">Ver todos</Link>
            </div>
          </div>
          <div className="grid min-h-60 flex-[1_1_320px] grid-cols-2 bg-azul">
            {artes.length > 0 ? (
              artes.map((src) => (
                <div key={src} className={`relative ${artes.length < 3 ? "row-span-2" : ""} ${artes.length === 1 ? "col-span-2" : ""}`}>
                  <Image src={src} alt="" fill sizes="(min-width: 768px) 20vw, 50vw" className="object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-2 flex items-center justify-center"><Planeta size={96} /></div>
            )}
          </div>
        </div>
      </section>

      {/* Desafio do mês */}
      <section id="desafio" aria-labelledby="desafio-titulo" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
        <div className="miolo flex flex-wrap items-center gap-10">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
            <Cabecalho etiqueta="Desafio do mês" titulo="Sua arte pode virar produto." id="desafio-titulo" />
            <p className="text-[17px] leading-[1.55] text-areia">
              Todo mês a gente solta um tema. A comunidade cria, a galera vota e a arte mais votada vira peça da loja, com o nome de quem criou.
            </p>
            <ol className="flex list-none flex-col gap-3 p-0">
              {challenge.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-4">
                  <span className="font-ficha text-[13px] text-laranja-claro">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-base">{s}</span>
                </li>
              ))}
            </ol>
            <div><a href="#newsletter" className="btn btn-fantasma">Quero participar</a></div>
          </div>
          <div className="flex min-w-0 flex-[1_1_360px] justify-center">
            <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-lg border border-dashed border-laranja-claro/70 p-8">
              <span className="etiqueta text-laranja-claro">Desafio de {challenge.month}</span>
              <span className="text-[2.5rem] font-semibold leading-none tracking-[-0.02em]">{challenge.theme}</span>
              <div className="flex justify-between gap-3 border-t border-creme/15 pt-4 font-ficha text-xs text-areia">
                <span>ENCERRA EM {challenge.endsAt}</span>
                {challenge.artCount != null && <span>{challenge.artCount} ARTES</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog */}
      {posts.length > 0 && (
        <section id="blog" aria-labelledby="blog-titulo" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
          <div className="miolo flex flex-col gap-6">
            <Cabecalho etiqueta="Transmissões da base" titulo="No blog" id="blog-titulo">
              <Link href="/blog" className="link-ficha">Ver todos os posts</Link>
            </Cabecalho>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {posts.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Votação */}
      <section id="voto" aria-labelledby="voto-titulo" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
        <div className="miolo flex flex-col gap-6">
          <Cabecalho etiqueta="Próximo drop" titulo="Quem escolhe a próxima coleção é você." id="voto-titulo" />
          <SugestaoDrop />
        </div>
      </section>

      {/* Loja */}
      <section id="loja" aria-labelledby="loja-titulo" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
        <div className="miolo flex flex-col gap-6">
          <Cabecalho etiqueta={store.eyebrow} titulo={store.title} id="loja-titulo">
            <Link href="/colecoes" className="link-ficha">Ver a loja</Link>
          </Cabecalho>
          <p className="-mt-2 max-w-[640px] text-[15px] leading-[1.55] text-areia">{store.text}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {store.products.map((p) => (
              <article key={p.name} className="card flex flex-col overflow-hidden">
                <Ph image={p.image} label={`[FOTO ${p.name.toUpperCase()}]`} ratio="1/1" />
                <div className="flex flex-col gap-1 p-3.5">
                  <span className="font-ficha text-[11px] text-areia">{p.tag && `${p.tag.toUpperCase()} · `}ARTE: {p.artist}</span>
                  <div className="flex justify-between gap-2">
                    <h3 className="text-base font-semibold">{p.name}</h3>
                    <span className="shrink-0 font-ficha text-sm text-laranja-claro">R$ {p.price}</span>
                  </div>
                </div>
              </article>
            ))}
            <article className="flex flex-col justify-center gap-3 rounded-lg border border-dashed border-laranja-claro/70 p-5">
              <span className="etiqueta text-laranja-claro">Personalizado</span>
              <h3 className="text-[19px] font-semibold leading-[1.2]">Você imagina, a gente materializa.</h3>
              <p className="text-sm leading-normal text-areia">Conta a ideia, um artista cria e você aprova o mockup antes de produzir.</p>
              <Link href="/colecoes" className="btn btn-fantasma self-start !px-3.5 !py-2.5 !text-sm">Personalizar a minha</Link>
            </article>
          </div>
        </div>
      </section>

      {/* Parceiros */}
      <section id="parceiros" aria-labelledby="parceiros-titulo" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
        <div className="miolo flex flex-col gap-6 rounded-lg border border-dashed border-laranja-claro/70 p-[clamp(22px,3.4vw,40px)]">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-2">
              <span className="etiqueta text-laranja-claro">Parceiros</span>
              <h2 id="parceiros-titulo" className="text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.01em]">Revenda, afiliados e criadores</h2>
              <p className="text-[15px] leading-[1.55] text-areia">Tem loja, canal ou comunidade própria? Dá pra revender, indicar ou criar peças com a sua marca.</p>
            </div>
            <Link href="/parceiros" className="btn btn-fantasma shrink-0">Quero ser parceiro</Link>
          </div>
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 border-t border-creme/15 p-0 pt-6">
            {partners.map((p, i) => (
              <li key={p.title} className="flex flex-col gap-1.5">
                <span className="font-ficha text-[13px] text-laranja-claro">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[17px] font-semibold">{p.title}</h3>
                <p className="text-sm leading-normal text-areia">{p.text}</p>
                <Link href="/parceiros" className="mt-1 text-sm font-medium text-laranja-claro hover:text-creme">{p.cta} →</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" aria-labelledby="news-titulo" className="relative px-6 pb-[clamp(64px,8vw,104px)]">
        <div className="painel miolo flex flex-wrap items-center gap-6 p-[clamp(24px,4vw,48px)] !shadow-none">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-2">
            <span className="etiqueta text-azul">Newsletter</span>
            <h2 id="news-titulo" className="text-[clamp(1.5rem,2.8vw,2.125rem)] font-bold tracking-[-0.015em] text-azul">Notícias da base no seu e-mail</h2>
            <p className="text-[15px] leading-[1.55] text-tinta">
              Quizzes novos, posts, desafio do mês e lançamentos da loja. Chega {newsletter.frequency}, sem spam, e dá pra sair quando quiser.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
