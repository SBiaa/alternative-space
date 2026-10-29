import Link from "next/link";
import { home } from "@/lib/home";
import { getPosts } from "@/lib/blog";
import { PostCard } from "@/components/PostCard";
import { Ph } from "@/components/Ph";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Star } from "@/components/Star";
import { discordHref } from "@/config/site";

export default function Home() {
  const posts = getPosts().slice(0, 3);
  const { hero, marquee, challenge, vote, quiz, store, partners, newsletter } = home;

  return (
    <>
      {/* Topo */}
      <section id="comunidade" className="relative overflow-hidden px-6 pb-22 pt-18">
        <div className="miolo flex flex-wrap items-center gap-14">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
            <span className="etiqueta text-azul">{hero.eyebrow}</span>
            <h1 className="font-titulo font-bold leading-[0.98] text-azul" style={{ fontSize: "clamp(2.75rem, 7vw, 5.25rem)" }}>
              {hero.title}
            </h1>
            <p className="max-w-[540px] text-[1.2rem] leading-relaxed text-tinta">{hero.text}</p>
            <div className="flex flex-wrap gap-3.5">
              <a href={discordHref} className="btn bg-laranja text-noite">Entrar no Discord</a>
              <Link href="/blog" className="btn bg-creme-claro text-noite">Ler o blog</Link>
            </div>
          </div>
          <div className="relative flex min-w-0 flex-[1_1_360px] justify-center py-6">
            <svg viewBox="0 0 560 360" aria-hidden="true" className="absolute left-[-10%] top-[18%] w-[120%]">
              <ellipse cx="280" cy="180" rx="270" ry="90" fill="none" stroke="#01121e" strokeWidth="2" opacity="0.4" transform="rotate(-14 280 180)" />
              <circle cx="30" cy="240" r="16" fill="#01121e" />
              <circle cx="520" cy="96" r="11" fill="#01121e" />
              <circle cx="430" cy="270" r="8" fill="#dd5d05" />
            </svg>
            <div className="relative w-full max-w-[440px] -rotate-2 overflow-hidden rounded-[14px] border-[3px] border-noite bg-creme-claro shadow-duro-lg">
              <div className="flex items-center justify-between border-b-[3px] border-noite bg-azul px-[22px] py-4 text-creme">
                <span className="font-titulo text-[1.4rem] font-bold">Base Alternative Space</span>
                {hero.membersOnline != null && <span className="font-ficha text-xs">{hero.membersOnline} ONLINE</span>}
              </div>
              <div className="flex flex-col gap-2.5 px-[22px] pb-6 pt-5 font-ficha text-[15px]">
                <span className="text-[11px] tracking-widest text-neutro">CANAIS</span>
                {hero.channels.map((c) => <span key={c}># {c}</span>)}
                <a href={discordHref} className="mt-2 rounded-full border-2 border-noite bg-laranja px-4 py-2.5 text-center font-titulo text-base font-bold text-noite no-underline">
                  Entrar no servidor
                </a>
              </div>
            </div>
            <Star className="absolute right-[4%] top-0" />
          </div>
        </div>
      </section>

      {/* Faixa */}
      <div className="border-y-2 border-noite bg-azul px-6 py-[18px] text-creme">
        <ul className="miolo flex list-none flex-wrap justify-center gap-x-7 gap-y-2 p-0 font-ficha text-sm uppercase tracking-widest">
          {marquee.map((m) => <li key={m}>✦ {m}</li>)}
        </ul>
      </div>

      {/* Desafio */}
      <section id="desafio" className="secao">
        <div className="miolo flex flex-wrap items-center gap-14">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
            <span className="etiqueta text-azul">Desafio do mês</span>
            <h2 className="h2 text-azul">Sua arte pode virar produto.</h2>
            <p className="text-lg leading-relaxed text-tinta">
              Todo mês a gente solta um tema. A comunidade cria, a galera vota e a arte mais votada vira peça da loja, com o nome de quem criou.
            </p>
            <ol className="flex list-none flex-col gap-3 p-0">
              {challenge.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-4">
                  <span className="font-ficha text-2xl font-bold text-azul">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[1.05rem]">{s}</span>
                </li>
              ))}
            </ol>
            <div><a href={discordHref} className="btn bg-azul text-creme">Quero participar</a></div>
          </div>
          <div className="flex min-w-0 flex-[1_1_380px] justify-center">
            <div className="flex w-full max-w-[460px] rotate-2 flex-col gap-[18px] rounded-[14px] border-[3px] border-noite bg-laranja px-8 py-9 shadow-duro-lg">
              <span className="etiqueta text-[13px]">Desafio de {challenge.month}</span>
              <span className="font-titulo text-[2.9rem] font-bold leading-none">{challenge.theme}</span>
              <div className="flex justify-between gap-3 border-t-2 border-dashed border-noite pt-4 font-ficha text-[13px]">
                <span>ENCERRA EM {challenge.endsAt}</span>
                {challenge.artCount != null && <span>{challenge.artCount} ARTES</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voto */}
      <section id="voto" className="secao border-y-2 border-noite bg-azul text-creme">
        <div className="miolo flex flex-col gap-10">
          <div className="flex max-w-[760px] flex-col gap-3">
            <span className="etiqueta text-laranja-claro">Vote no próximo drop</span>
            <h2 className="h2">Quem escolhe a próxima coleção é você.</h2>
            <p className="text-lg leading-relaxed text-azul-claro">
              Três ideias na mesa. A mais votada ganha arte, mockup e vira lançamento. Quem votou ainda sai na frente na hora da compra.
            </p>
          </div>
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 p-0">
            {vote.options.map((o, i) => (
              <li key={o.title} className="card flex flex-col overflow-hidden bg-creme text-noite">
                <Ph image={o.image} label={`[IMAGEM OPÇÃO ${String.fromCharCode(65 + i)}]`} />
                <div className="flex flex-col gap-3.5 px-[22px] pb-6 pt-5">
                  <h3 className="font-titulo text-2xl font-semibold">{o.title}</h3>
                  <Link href="/votar" className="btn self-start bg-laranja !px-5 !py-2.5 !text-base !shadow-none">Votar</Link>
                </div>
              </li>
            ))}
          </ul>
          <span className="font-ficha text-[13px] text-azul-claro">VOTAÇÃO ABERTA ATÉ {vote.closesAt}</span>
        </div>
      </section>

      {/* Blog */}
      {posts.length > 0 && (
        <section id="blog" className="secao">
          <div className="miolo flex flex-col gap-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className="etiqueta text-azul">Blog</span>
                <h2 className="h2 text-azul">Nada de mais do mesmo.</h2>
              </div>
              <Link href="/blog" className="font-titulo text-xl font-bold text-azul">Ver todos os posts →</Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-7">
              {posts.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Quiz */}
      <section id="quiz" className="px-6 pb-22">
        <div className="miolo flex flex-wrap items-center justify-between gap-7 rounded-2xl border-[3px] border-noite bg-laranja px-10 py-12 shadow-duro-lg">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
            <span className="etiqueta text-[13px]">Quiz</span>
            <h2 className="font-titulo font-bold leading-[1.02]" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>{quiz.title}</h2>
            <p className="text-lg leading-normal">{quiz.text}</p>
          </div>
          <Link href="/quiz" className="btn bg-noite text-creme !shadow-none">Fazer o quiz</Link>
        </div>
      </section>

      {/* Loja */}
      <section id="loja" className="secao border-y-2 border-noite bg-creme-claro">
        <div className="miolo flex flex-col gap-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex max-w-[640px] flex-col gap-3">
              <span className="etiqueta text-azul">{store.eyebrow}</span>
              <h2 className="font-titulo font-bold leading-[1.02] text-azul" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}>{store.title}</h2>
              <p className="text-[1.05rem] leading-normal text-tinta">{store.text}</p>
            </div>
            <a href="#loja" className="font-titulo text-xl font-bold text-azul">Ver a loja completa →</a>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
            {store.products.map((p) => (
              <article key={p.name} className="card flex flex-col overflow-hidden bg-creme">
                <Ph image={p.image} label={`[FOTO ${p.name.toUpperCase()}]`} />
                <div className="flex flex-col gap-1.5 px-5 pb-5 pt-4">
                  <span className="font-ficha text-xs text-tinta">{p.tag && `${p.tag.toUpperCase()} · `}ARTE: {p.artist}</span>
                  <h3 className="font-titulo text-[1.4rem] font-semibold">{p.name}</h3>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-titulo text-[1.4rem] font-bold text-azul">R$ {p.price}</span>
                    <a href="#loja" className="rounded-full border-2 border-noite bg-laranja px-4 py-2 font-titulo text-[15px] font-bold text-noite no-underline">Quero</a>
                  </div>
                </div>
              </article>
            ))}
            <article className="card flex flex-col justify-center gap-3 bg-azul p-6 text-creme">
              <span className="etiqueta text-xs text-laranja-claro">Personalizado</span>
              <h3 className="font-titulo text-[1.6rem] font-semibold leading-[1.1]">Você imagina, a gente materializa.</h3>
              <p className="text-[15px] leading-normal text-azul-claro">Conta a ideia, um artista cria e você aprova o mockup antes de produzir.</p>
              <a href="#loja" className="btn self-start bg-laranja text-noite !px-[18px] !py-2.5 !text-base !shadow-none">Personalizar a minha</a>
            </article>
          </div>
        </div>
      </section>

      {/* Parceiros */}
      <section id="parceiros" className="secao">
        <div className="miolo flex flex-col gap-9">
          <div className="flex max-w-[760px] flex-col gap-3">
            <span className="etiqueta text-azul">Parceiros</span>
            <h2 className="h2 text-azul">Cresça com a gente.</h2>
            <p className="text-lg leading-relaxed text-tinta">Tem loja, canal ou comunidade própria? Dá pra revender, indicar ou criar peças com a sua marca.</p>
          </div>
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 p-0">
            {partners.map((p, i) => (
              <li key={p.title} className="card flex flex-col gap-3 p-7">
                <span className="font-ficha text-3xl font-bold text-azul">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-titulo text-[1.6rem] font-semibold">{p.title}</h3>
                <p className="leading-normal text-tinta">{p.text}</p>
                <Link href="/parceiros" className="font-titulo text-[1.05rem] font-bold text-azul">{p.cta} →</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="secao bg-noite text-creme">
        <div className="miolo flex flex-wrap items-center justify-between gap-8">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
            <span className="etiqueta text-laranja-claro">Newsletter</span>
            <h2 className="h2">O melhor da base, no seu e-mail.</h2>
            <p className="text-lg leading-relaxed text-[#c9ced4]">
              Posts novos, desafio do mês, votação e drops antes de todo mundo. Chega {newsletter.frequency}, sem spam.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
