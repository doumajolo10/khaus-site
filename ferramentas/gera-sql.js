// Gera o banco do painel a partir do que está publicado no index.html (produtos, categorias, cores, esgotados).
// Saídas: supabase/khaus.sql (estrutura + carga; fora do git porque tem o e-mail da equipe)
//         painel/catalogo.json (categorias, cores e produtos; usado pelo modo demonstração e pelas listas do painel)
// Uso: node ferramentas/gera-sql.js
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..");
const h = fs.readFileSync(path.join(R, "index.html"), "utf8");
function bloco(nome) { // pega o literal JS de "var NOME=" até o ; que fecha (respeitando colchetes/chaves e strings)
  const i = h.indexOf("var " + nome + "="); if (i < 0) throw new Error(nome + " não achado");
  let j = i + nome.length + 5, d = 0, str = null;
  for (let k = j; k < h.length; k++) {
    const c = h[k];
    if (str) { if (c === "\\") { k++; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'") { str = c; continue; }
    if (c === "[" || c === "{") d++; else if (c === "]" || c === "}") { d--; if (d === 0) return h.slice(j, k + 1); }
  }
  throw new Error(nome + " sem fim");
}
const ler = n => Function('"use strict";return (' + bloco(n) + ")")();
const P = ler("P"), CATS = ler("CATS"), FIN = ler("FIN"), ESG = ler("ESGOTADO");
console.log("produtos", P.length, "categorias", CATS.length, "cores", Object.keys(FIN).length, "esgotados", Object.keys(ESG).length);

const produtos = P.map((p, i) => ({ id: p.id, cat: p.cat, nome: p.name, sub: p.sub || "", descricao: p.desc || "", specs: p.specs || "", cores: p.fins || [], esgotadas: ESG[p.id] || [], estoque: {}, min: p.min || 1, faixas: p.tiers || [], ativo: true, ordem: i + 1, foto: null }));
fs.mkdirSync(path.join(R, "painel"), { recursive: true });
fs.writeFileSync(path.join(R, "painel", "catalogo.json"), JSON.stringify({ gerado: new Date().toISOString().slice(0, 10), categorias: CATS, cores: FIN, produtos }));

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const arr = a => a.length ? "array[" + a.map(q).join(",") + "]::text[]" : "'{}'::text[]";
const js = o => q(JSON.stringify(o)) + "::jsonb";
const linhas = produtos.map(p => `(${[q(p.id), q(p.cat), q(p.nome), q(p.sub), q(p.descricao), q(p.specs), arr(p.cores), arr(p.esgotadas), js(p.estoque), p.min, js(p.faixas), "true", p.ordem].join(", ")})`);
const PRAZOS = [
  { id: "padrao", nome: "Padrão", de: 20, ate: 25, extra: 0, tag: "Recomendado" },
  { id: "expresso", nome: "Expresso", de: 12, ate: 15, extra: 15, tag: "" },
  { id: "turbo", nome: "Turbo", de: 7, ate: 10, extra: 25, tag: "Mais rápido" }
];
const sql = `-- =====================================================================================
-- Painel de estoque da Khaus Brindes · rodar UMA vez no Supabase (projeto "Mejex Project"):
-- SQL Editor → New query → colar este arquivo inteiro → Run. Pode rodar de novo sem duplicar nada.
-- Gerado por ferramentas/gera-sql.js em ${new Date().toISOString().slice(0, 10)} a partir do site publicado.
-- =====================================================================================

-- ============ 1. ESTRUTURA ============
create table if not exists public.khaus_produtos (
  id           text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  cat          text not null,
  nome         text not null check (char_length(nome) between 2 and 120),
  sub          text not null default '' check (char_length(sub) <= 160),
  descricao    text not null default '' check (char_length(descricao) <= 4000),
  specs        text not null default '' check (char_length(specs) <= 600),
  cores        text[] not null default '{}' check (cardinality(cores) <= 60),
  esgotadas    text[] not null default '{}' check (cardinality(esgotadas) <= 60),
  estoque      jsonb not null default '{}'::jsonb check (jsonb_typeof(estoque) = 'object'),
  min          int not null default 1 check (min between 1 and 100000),
  faixas       jsonb not null default '[]'::jsonb check (jsonb_typeof(faixas) = 'array' and jsonb_array_length(faixas) <= 12),
  ativo        boolean not null default true,
  ordem        int not null default 0,
  foto         text check (foto is null or foto like 'https://cwsjddppdogvyitspbfr.supabase.co/storage/v1/object/public/khaus-fotos/%'),
  criado_em    timestamptz not null default now(),
  alterado_em  timestamptz not null default now(),
  alterado_por text
);
create table if not exists public.khaus_config (
  chave        text primary key check (chave in ('prazos', 'prazosDemo', 'precosDemo', 'cores')),
  valor        jsonb not null,
  alterado_em  timestamptz not null default now(),
  alterado_por text
);
create table if not exists public.khaus_equipe (
  email     text primary key,
  nome      text,
  criado_em timestamptz not null default now()
);
create table if not exists public.khaus_historico (
  id     bigint generated always as identity primary key,
  tabela text not null,
  chave  text not null,
  acao   text not null,
  antes  jsonb not null,
  quem   text,
  quando timestamptz not null default now()
);

create or replace function public.khaus_eh_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.khaus_equipe where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
create or replace function public.khaus_carimbo() returns trigger
language plpgsql set search_path = public as $$
begin
  new.alterado_em := now();
  new.alterado_por := coalesce(auth.jwt() ->> 'email', new.alterado_por);
  return new;
end $$;
create or replace function public.khaus_guarda_historico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.khaus_historico (tabela, chave, acao, antes, quem)
  values (tg_table_name, coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'chave'), lower(tg_op), to_jsonb(old), auth.jwt() ->> 'email');
  return null;
end $$;
drop trigger if exists khaus_carimbo on public.khaus_produtos;
create trigger khaus_carimbo before insert or update on public.khaus_produtos for each row execute function public.khaus_carimbo();
drop trigger if exists khaus_carimbo on public.khaus_config;
create trigger khaus_carimbo before insert or update on public.khaus_config for each row execute function public.khaus_carimbo();
drop trigger if exists khaus_historico on public.khaus_produtos;
create trigger khaus_historico after update or delete on public.khaus_produtos for each row execute function public.khaus_guarda_historico();
drop trigger if exists khaus_historico on public.khaus_config;
create trigger khaus_historico after update or delete on public.khaus_config for each row execute function public.khaus_guarda_historico();

-- segurança: o site lê produtos ativos e a configuração; só a equipe altera
alter table public.khaus_produtos enable row level security;
alter table public.khaus_config enable row level security;
alter table public.khaus_equipe enable row level security;
alter table public.khaus_historico enable row level security;
drop policy if exists "khaus: site le ativos" on public.khaus_produtos;
drop policy if exists "khaus: equipe le tudo" on public.khaus_produtos;
drop policy if exists "khaus: equipe insere" on public.khaus_produtos;
drop policy if exists "khaus: equipe altera" on public.khaus_produtos;
drop policy if exists "khaus: equipe exclui" on public.khaus_produtos;
drop policy if exists "khaus: site le config" on public.khaus_config;
drop policy if exists "khaus: equipe grava config" on public.khaus_config;
drop policy if exists "khaus: equipe altera config" on public.khaus_config;
drop policy if exists "khaus: equipe se ve" on public.khaus_equipe;
drop policy if exists "khaus: equipe le historico" on public.khaus_historico;
create policy "khaus: site le ativos" on public.khaus_produtos for select to anon, authenticated using (ativo);
create policy "khaus: equipe le tudo" on public.khaus_produtos for select to authenticated using (public.khaus_eh_equipe());
create policy "khaus: equipe insere" on public.khaus_produtos for insert to authenticated with check (public.khaus_eh_equipe());
create policy "khaus: equipe altera" on public.khaus_produtos for update to authenticated using (public.khaus_eh_equipe()) with check (public.khaus_eh_equipe());
create policy "khaus: equipe exclui" on public.khaus_produtos for delete to authenticated using (public.khaus_eh_equipe());
create policy "khaus: site le config" on public.khaus_config for select to anon, authenticated using (true);
create policy "khaus: equipe grava config" on public.khaus_config for insert to authenticated with check (public.khaus_eh_equipe());
create policy "khaus: equipe altera config" on public.khaus_config for update to authenticated using (public.khaus_eh_equipe()) with check (public.khaus_eh_equipe());
create policy "khaus: equipe se ve" on public.khaus_equipe for select to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "khaus: equipe le historico" on public.khaus_historico for select to authenticated using (public.khaus_eh_equipe());
revoke all on public.khaus_produtos, public.khaus_config, public.khaus_equipe, public.khaus_historico from anon;
grant select on public.khaus_produtos, public.khaus_config to anon;
grant select, insert, update, delete on public.khaus_produtos to authenticated;
grant select, insert, update on public.khaus_config to authenticated;
grant select on public.khaus_equipe, public.khaus_historico to authenticated;
revoke insert, update, delete on public.khaus_equipe, public.khaus_historico from authenticated;
revoke execute on function public.khaus_eh_equipe() from public, anon;
grant execute on function public.khaus_eh_equipe() to authenticated;
revoke execute on function public.khaus_carimbo() from public, anon, authenticated;
revoke execute on function public.khaus_guarda_historico() from public, anon, authenticated;

-- fotos novas enviadas pelo painel (as atuais continuam no próprio site)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('khaus-fotos', 'khaus-fotos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];
drop policy if exists "khaus: equipe ve fotos" on storage.objects;
drop policy if exists "khaus: equipe envia fotos" on storage.objects;
drop policy if exists "khaus: equipe troca fotos" on storage.objects;
drop policy if exists "khaus: equipe apaga fotos" on storage.objects;
create policy "khaus: equipe ve fotos" on storage.objects for select to authenticated using (bucket_id = 'khaus-fotos' and public.khaus_eh_equipe());
create policy "khaus: equipe envia fotos" on storage.objects for insert to authenticated with check (bucket_id = 'khaus-fotos' and public.khaus_eh_equipe());
create policy "khaus: equipe troca fotos" on storage.objects for update to authenticated using (bucket_id = 'khaus-fotos' and public.khaus_eh_equipe());
create policy "khaus: equipe apaga fotos" on storage.objects for delete to authenticated using (bucket_id = 'khaus-fotos' and public.khaus_eh_equipe());

-- ============ 2. EQUIPE (e-mails que podem usar o painel) ============
insert into public.khaus_equipe (email, nome) values
  ('doumajolo10@gmail.com', 'Douglas (MAJEX)')
  -- , ('email.da.khaus@exemplo.com', 'Nome da pessoa')
on conflict (email) do nothing;

-- ============ 3. CONFIGURAÇÃO INICIAL ============
insert into public.khaus_config (chave, valor) values
  ('prazos', ${js(PRAZOS)}),
  ('prazosDemo', 'true'::jsonb),
  ('precosDemo', 'true'::jsonb),
  ('cores', '{}'::jsonb)
on conflict (chave) do nothing;

-- ============ 4. CARGA: os ${produtos.length} produtos do site ============
insert into public.khaus_produtos (id, cat, nome, sub, descricao, specs, cores, esgotadas, estoque, min, faixas, ativo, ordem) values
${linhas.join(",\n")}
on conflict (id) do nothing;

select (select count(*) from public.khaus_produtos) as produtos, (select count(*) from public.khaus_config) as configuracoes;
`;
fs.mkdirSync(path.join(R, "supabase"), { recursive: true });
fs.writeFileSync(path.join(R, "supabase", "khaus.sql"), sql);
console.log("supabase/khaus.sql", Math.round(sql.length / 1024) + " KB · painel/catalogo.json");
