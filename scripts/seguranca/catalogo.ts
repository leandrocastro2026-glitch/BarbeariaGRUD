/**
 * Catálogo da auditoria de segurança: para cada teste, a categoria (baseada no OWASP Top 10),
 * a gravidade e a explicação em linguagem simples do que a falha permitiria a um invasor.
 */

export const CATEGORIAS = {
  acesso: "A01 · Controle de acesso",
  autenticacao: "A07 · Autenticação e sessão",
  criptografia: "A02 · Proteção do cookie de sessão",
  vazamento: "Exposição de dados sensíveis",
  injecao: "A03 · Injeção (SQL, XSS e similares)",
  atribuicao: "Atribuição em massa (campos não permitidos)",
  csrf: "CSRF · Ações forjadas por outros sites",
  redirecionamento: "Redirecionamento aberto",
  configuracao: "A05 · Configuração de segurança",
} as const;

export type Categoria = keyof typeof CATEGORIAS;
export type Severidade = "CRÍTICA" | "ALTA" | "MÉDIA" | "BAIXA";
export const ORDEM_SEVERIDADE: Record<Severidade, number> = { CRÍTICA: 0, ALTA: 1, MÉDIA: 2, BAIXA: 3 };

type Teste = {
  categoria: Categoria;
  severidade: Severidade;
  titulo: string;
  /** O que o teste fez, como um invasor faria. */
  testado: string;
  /** O que a falha permite na prática — o "por que isso importa". */
  impacto: string;
  /** Onde olhar e o que fazer para corrigir. */
  correcao: string;
};

export const CATALOGO = {
  "preparacao-login": {
    categoria: "autenticacao",
    severidade: "CRÍTICA",
    titulo: "Login de usuários válidos não funcionou",
    testado: "Criou um admin e uma recepcionista temporários e tentou entrar com as senhas corretas.",
    impacto:
      "Ninguém consegue entrar no sistema (a barbearia fica parada) e o resto da auditoria não pôde rodar — o resultado dos outros testes não é confiável.",
    correcao: "Verifique src/auth.ts (authorize), o AUTH_SECRET no .env e se o servidor está usando o mesmo banco (DATABASE_URL).",
  },

  // ---------- Cookie de sessão ----------
  "cookie-httponly": {
    categoria: "criptografia",
    severidade: "ALTA",
    titulo: "Cookie de sessão pode ser lido por JavaScript",
    testado: "Fez login e conferiu se o cookie de sessão tem a marca HttpOnly.",
    impacto:
      "Se qualquer script malicioso rodar na página (por exemplo, via XSS), ele copia o cookie e o invasor entra como aquele usuário — inclusive como administrador — sem saber a senha.",
    correcao: "Não sobrescreva as opções de cookie do Auth.js em src/auth.ts; o padrão já é HttpOnly.",
  },
  "cookie-secure": {
    categoria: "criptografia",
    severidade: "ALTA",
    titulo: "Cookie de sessão sem a marca Secure (só testado em HTTPS)",
    testado: "Via HTTPS, conferiu se o cookie de sessão tem Secure e o prefixo __Secure-.",
    impacto:
      "O navegador poderia mandar o cookie de login por uma conexão sem criptografia; alguém no mesmo Wi-Fi capturaria a sessão e entraria como o usuário.",
    correcao: "Publique atrás de HTTPS repassando X-Forwarded-Proto: https (o Auth.js ativa o Secure sozinho com trustHost: true em src/auth.ts).",
  },
  "cookie-samesite": {
    categoria: "criptografia",
    severidade: "MÉDIA",
    titulo: "Cookie de sessão sem SameSite",
    testado: "Conferiu se o cookie de sessão tem SameSite=Lax ou Strict.",
    impacto:
      "O navegador enviaria o login junto com requisições disparadas por outros sites, permitindo que um site malicioso faça ações (excluir clientes, criar usuários) em nome de quem está logado.",
    correcao: "Mantenha o padrão do Auth.js (SameSite=Lax) em src/auth.ts.",
  },
  "cookie-criptografado": {
    categoria: "criptografia",
    severidade: "MÉDIA",
    titulo: "Conteúdo da sessão não está criptografado",
    testado: "Conferiu se o token de sessão é um JWE (criptografado, 5 partes) e não um JWT legível.",
    impacto:
      "Quem pegar o cookie (num computador compartilhado, por exemplo) leria id, e-mail e perfil do usuário — informação útil para planejar um ataque.",
    correcao: "Não troque a estratégia de sessão nem o encode/decode padrão do Auth.js em src/auth.ts.",
  },

  // ---------- Sem login ----------
  "anonimo-api": {
    categoria: "acesso",
    severidade: "CRÍTICA",
    titulo: "API responde sem login",
    testado: "Chamou todas as rotas da API (listar, criar, editar, excluir) sem estar logado.",
    impacto:
      "Qualquer pessoa na mesma rede (ou na internet, se publicado) leria e alteraria clientes, agendamentos, preços e usuários sem precisar de senha.",
    correcao:
      "Toda função GET/POST/PUT/PATCH/DELETE em src/app/api/**/route.ts deve começar com exigirUsuario(...). O teste tests/rotas-protegidas.test.ts aponta qual rota esqueceu.",
  },
  "anonimo-paginas": {
    categoria: "acesso",
    severidade: "CRÍTICA",
    titulo: "Páginas abrem sem login",
    testado: "Abriu as páginas internas (agenda, clientes, dashboard, usuários) sem estar logado.",
    impacto: "Dados da barbearia (agenda, nomes de clientes, faturamento) ficam visíveis para qualquer um que digitar o endereço.",
    correcao: "Confira o matcher em src/proxy.ts e se a página chama exigirPagina(...) antes de buscar dados.",
  },

  // ---------- Token ----------
  "token-forjado": {
    categoria: "autenticacao",
    severidade: "CRÍTICA",
    titulo: "Aceita sessão forjada",
    testado: "Montou à mão um token dizendo 'sou ADMIN' sem assinatura (alg=none) e tentou usar a API.",
    impacto: "Qualquer pessoa criaria um 'crachá' falso de administrador e teria controle total do sistema.",
    correcao: "Não aceite tokens fora do auth() do Auth.js; nunca decodifique o JWT manualmente para autorizar.",
  },
  "token-adulterado": {
    categoria: "autenticacao",
    severidade: "CRÍTICA",
    titulo: "Aceita sessão adulterada",
    testado: "Pegou um token válido, alterou alguns caracteres e tentou usar a API.",
    impacto: "Um invasor poderia modificar uma sessão existente (por exemplo, trocar o perfil para ADMIN) e o servidor aceitaria.",
    correcao: "Garanta que AUTH_SECRET está definido e que a sessão só é lida via auth() em src/lib/sessao.ts.",
  },

  // ---------- Recepção ----------
  "cliente-api": {
    categoria: "acesso",
    severidade: "CRÍTICA",
    titulo: "Cliente da agenda online consegue usar a gestão",
    testado:
      "Logado como cliente (conta criada pelo site), tentou listar clientes, ver/criar/excluir agendamentos de outros, mexer em usuários, barbeiros e serviços pela API.",
    impacto:
      "Qualquer pessoa que se cadastrasse no site veria telefones e horários de todos os clientes, poderia cancelar a agenda dos outros ou até virar administradora.",
    correcao:
      "O perfil CLIENTE em src/lib/permissoes.ts deve ter [] em todos os recursos, exceto 'portal'. Toda rota da API precisa chamar exigirUsuario(recurso) com o recurso certo.",
  },
  "dados-cifrados": {
    categoria: "vazamento",
    severidade: "ALTA",
    titulo: "Dados pessoais gravados em texto puro no banco",
    testado:
      "Leu o banco direto, sem passar pelo app (como faria quem copiasse o arquivo .db ou um backup), e conferiu nome, telefone e e-mail.",
    impacto:
      "Um backup vazado, um acesso indevido ao volume do servidor ou um erro de configuração entregaria nomes, telefones e e-mails de todos os clientes e da equipe.",
    correcao:
      "Defina DADOS_CHAVE e confira CAMPOS_CIFRADOS em src/lib/prisma.ts. Para cifrar dados antigos, rode npm run dados:cifrar.",
  },
  "recepcao-api": {
    categoria: "acesso",
    severidade: "CRÍTICA",
    titulo: "Recepção consegue fazer ações de administrador",
    testado:
      "Logado como recepção, tentou: listar/criar/excluir usuários, se promover a ADMIN, ler e alterar clientes, e criar/editar/excluir barbeiros e serviços.",
    impacto:
      "Uma recepcionista (ou quem roubar a senha dela) poderia virar administradora, apagar contas, mudar preços e ver dados de clientes que não deveria — escalada de privilégio.",
    correcao:
      "Confira a matriz em src/lib/permissoes.ts e se a rota chama exigirUsuario(recurso, 'escrever') com o recurso certo. A evidência mostra qual rota respondeu diferente de 403.",
  },
  "recepcao-paginas": {
    categoria: "acesso",
    severidade: "ALTA",
    titulo: "Recepção abre páginas restritas",
    testado: "Logado como recepção, abriu dashboard, usuários, clientes e as telas de criar/editar barbeiros e serviços.",
    impacto: "A recepção veria faturamento, lista de usuários ou dados de clientes que foram propositalmente escondidos dela.",
    correcao: "A página deve chamar exigirPagina(recurso, ação) antes de buscar dados. A evidência mostra qual página abriu.",
  },
  "recepcao-faturamento": {
    categoria: "acesso",
    severidade: "MÉDIA",
    titulo: "Recepção vê o faturamento na página Hoje",
    testado: "Logado como recepção, abriu a página inicial e procurou o indicador 'Faturado'.",
    impacto: "Informação financeira da barbearia fica visível para quem não deveria ter acesso a ela.",
    correcao: "Em src/app/page.tsx o KPI 'Faturado' deve aparecer só quando pode(perfil, 'faturamento', 'ler').",
  },

  // ---------- Vazamento ----------
  "vazamento-telefone": {
    categoria: "vazamento",
    severidade: "ALTA",
    titulo: "Telefone de clientes exposto para a recepção",
    testado: "Logado como recepção (sem acesso a clientes), chamou a API de agendamentos e procurou telefones na resposta.",
    impacto:
      "Dados pessoais dos clientes ficam acessíveis a quem não tem permissão — risco de uso indevido e problema com a LGPD — mesmo sem aparecer na tela.",
    correcao: "Em src/lib/services/agendamentos.ts (incluirRelacoes), selecione do cliente apenas id e nome.",
  },
  "vazamento-hash-api": {
    categoria: "vazamento",
    severidade: "CRÍTICA",
    titulo: "Hash de senha aparece na API de usuários",
    testado: "Listou os usuários pela API e procurou hash/senha na resposta.",
    impacto:
      "Com o hash, o invasor tenta adivinhar as senhas no próprio computador, sem limite de tentativas; senhas fracas caem em minutos e ele entra como qualquer usuário.",
    correcao: "Em src/lib/services/usuarios.ts use sempre o select 'publico' (sem senhaHash).",
  },
  "vazamento-hash-sessao": {
    categoria: "vazamento",
    severidade: "CRÍTICA",
    titulo: "Dados de senha aparecem na sessão",
    testado: "Leu /api/auth/session (acessível a qualquer script da página) e procurou senha/hash.",
    impacto: "Qualquer script na página teria acesso a dados de senha do usuário logado.",
    correcao: "No callback session de src/auth.ts, copie só id, perfil e versaoSessao — nunca o registro inteiro do usuário.",
  },
  "vazamento-hash-html": {
    categoria: "vazamento",
    severidade: "CRÍTICA",
    titulo: "Hash de senha aparece no HTML",
    testado: "Baixou o HTML da tela de usuários e procurou hashes de senha.",
    impacto: "O hash vai para o navegador (e para o histórico/cache), permitindo quebra de senha offline.",
    correcao: "Não passe o registro completo do usuário para componentes; use usuarios.listar()/buscar() (sem senhaHash).",
  },

  // ---------- Atribuição em massa ----------
  "atribuicao-cliente": {
    categoria: "atribuicao",
    severidade: "MÉDIA",
    titulo: "Cadastro aceita campos internos (id, criadoEm)",
    testado: "Criou um cliente enviando também id e data de criação inventados.",
    impacto: "Um invasor poderia sobrescrever registros existentes escolhendo o id ou falsificar o histórico com datas inventadas.",
    correcao: "Passe para o Prisma apenas o resultado do schema Zod (validar(...)), nunca o corpo bruto da requisição.",
  },
  "atribuicao-usuario": {
    categoria: "atribuicao",
    severidade: "CRÍTICA",
    titulo: "Cadastro de usuário aceita senhaHash/id/versaoSessao",
    testado: "Criou um usuário enviando também um senhaHash, um id e uma versaoSessao escolhidos pelo atacante.",
    impacto:
      "Quem pudesse criar/editar usuários definiria o hash da senha diretamente, escolheria ids ou reviveria sessões que deveriam ter sido derrubadas.",
    correcao: "Em src/lib/services/usuarios.ts, monte o data só com os campos validados pelo Zod e o hash gerado no servidor.",
  },

  // ---------- Injeção ----------
  "xss-armazenado": {
    categoria: "injecao",
    severidade: "ALTA",
    titulo: "HTML/script injetado é executado na página",
    testado: "Cadastrou um cliente com nome contendo <img onerror=…> e verificou se a tela de clientes exibe isso como texto.",
    impacto:
      "O código do invasor rodaria no navegador de quem abrir a tela (inclusive o admin), podendo agir em nome dele: criar usuários, apagar dados, mudar senhas.",
    correcao: "Nunca use dangerouslySetInnerHTML com dados de usuário; deixe o React escapar o texto.",
  },
  "sqli-data": {
    categoria: "injecao",
    severidade: "CRÍTICA",
    titulo: "Filtro de data aceita SQL injection",
    testado: "Enviou ?data=2026-01-01' OR 1=1-- no filtro de agendamentos.",
    impacto: "Comandos SQL do invasor rodariam no banco: ler todas as tabelas (inclusive senhas), alterar ou apagar tudo.",
    correcao: "Valide o filtro com filtroAgendamentosSchema e use apenas consultas do Prisma (nunca $queryRawUnsafe com texto do usuário).",
  },
  "sqli-barbeiro": {
    categoria: "injecao",
    severidade: "CRÍTICA",
    titulo: "Filtro de barbeiro aceita SQL injection",
    testado: "Enviou ?barbeiroId=1 OR 1=1 no filtro de agendamentos.",
    impacto: "Mesmo risco da injeção de SQL: leitura e destruição do banco inteiro.",
    correcao: "O barbeiroId deve passar pelo schema Zod (número inteiro positivo) antes de chegar ao Prisma.",
  },
  "path-traversal": {
    categoria: "injecao",
    severidade: "ALTA",
    titulo: "Id com ../ é aceito",
    testado: "Pediu /api/clientes/..%2f..%2fusuarios para tentar escapar da rota.",
    impacto: "O invasor poderia alcançar rotas ou arquivos que não deveria a partir de uma rota permitida.",
    correcao: "Use idValido() (inteiro positivo) em todo [id] antes de consultar.",
  },
  "prototype-pollution": {
    categoria: "injecao",
    severidade: "MÉDIA",
    titulo: "__proto__ no JSON é aproveitado",
    testado: 'Enviou {"__proto__":{"admin":true}} no cadastro de cliente.',
    impacto: "Poderia alterar o comportamento de objetos no servidor e, em casos piores, burlar checagens de permissão.",
    correcao: "Valide o corpo com schemas Zod (z.object descarta chaves desconhecidas) e não faça merge do corpo bruto em objetos.",
  },
  "entrada-gigante": {
    categoria: "injecao",
    severidade: "BAIXA",
    titulo: "Aceita textos gigantes",
    testado: "Enviou um nome de cliente com 5.000 caracteres.",
    impacto: "Um invasor encheria o banco com lixo, deixaria as telas lentas ou quebradas e poderia derrubar o servidor.",
    correcao: "Mantenha .max(...) nos campos de texto em src/lib/validacao.ts.",
  },
  "erro-detalhado": {
    categoria: "configuracao",
    severidade: "MÉDIA",
    titulo: "Erro mostra detalhes internos",
    testado: "Enviou JSON quebrado e verificou se a resposta traz stack trace ou caminhos de arquivos.",
    impacto: "Revela a estrutura interna do servidor (arquivos, bibliotecas, versões), o que ajuda o invasor a escolher o próximo ataque.",
    correcao: "Em src/lib/api.ts (responder), erros inesperados devem virar só 'Erro interno do servidor.'; detalhes ficam no log do servidor.",
  },

  // ---------- Redirecionamento / CSRF ----------
  "redirecionamento-aberto": {
    categoria: "redirecionamento",
    severidade: "MÉDIA",
    titulo: "Login redireciona para site externo",
    testado: "Fez login com callbackUrl apontando para https://evil.example, //evil.example e /\\evil.example.",
    impacto:
      "Um golpista mandaria um link legítimo da barbearia que, depois do login, leva a uma página falsa idêntica para roubar senhas (phishing).",
    correcao: "Mantenha a função destinoSeguro em src/app/acoes-auth.ts e não configure redirect customizado no Auth.js que aceite outros domínios.",
  },
  "csrf-login": {
    categoria: "csrf",
    severidade: "MÉDIA",
    titulo: "Login funciona sem token CSRF",
    testado: "Tentou fazer login enviando o formulário direto, sem o token anti-CSRF.",
    impacto: "Um site malicioso poderia logar a vítima numa conta do invasor e observar o que ela cadastra.",
    correcao: "Não desative a proteção CSRF do Auth.js nem chame o callback de credenciais por fora dele.",
  },
  "csrf-outra-origem": {
    categoria: "csrf",
    severidade: "ALTA",
    titulo: "API aceita escrita vinda de outro site",
    testado: "Com a sessão de um admin, enviou um POST com Origin de outro site (sec-fetch-site: cross-site).",
    impacto:
      "Se um admin logado abrir um site malicioso, esse site poderia criar usuários, excluir clientes ou mudar preços usando a sessão dele.",
    correcao: "Confira origemValida() em src/proxy.ts e se o matcher cobre /api.",
  },
  "csrf-mesmo-host": {
    categoria: "csrf",
    severidade: "ALTA",
    titulo: "API aceita escrita de outra porta do mesmo computador",
    testado: "Enviou um DELETE com Origin http://localhost:4000 (outro app no mesmo computador).",
    impacto: "Qualquer outro programa/site rodando no mesmo computador poderia alterar ou apagar dados usando a sessão aberta no navegador.",
    correcao: "Em src/proxy.ts a origem deve ser exatamente igual à do próprio site (req.nextUrl.origin).",
  },

  // ---------- Autenticação ----------
  "enumeracao-usuarios": {
    categoria: "autenticacao",
    severidade: "BAIXA",
    titulo: "Dá para descobrir quais e-mails têm conta",
    testado: "Mediu o tempo de resposta do login com e-mail cadastrado e com e-mail inexistente.",
    impacto: "O invasor descobre quais logins existem e concentra força bruta ou golpes de phishing só neles.",
    correcao: "Em src/auth.ts, mantenha a verificação com hash falso quando o e-mail não existe e a mesma mensagem de erro para todos os casos.",
  },
  "forca-bruta": {
    categoria: "autenticacao",
    severidade: "ALTA",
    titulo: "Sem bloqueio contra tentativa de senhas",
    testado: "Errou a senha 6 vezes seguidas para o mesmo e-mail.",
    impacto: "Um robô testaria milhares de senhas por hora até acertar e entraria na conta (senhas fracas caem rápido).",
    correcao: "Confira limiteLogin em src/lib/limite-login.ts e o uso em src/auth.ts (bloqueado/registrarFalha).",
  },
  "sessao-apos-troca": {
    categoria: "autenticacao",
    severidade: "ALTA",
    titulo: "Trocar a senha não derruba sessões abertas",
    testado: "Logou um usuário, o admin trocou a senha dele, e a sessão antiga tentou usar a API de novo.",
    impacto:
      "Quem roubou a senha (ou um ex-funcionário) continua dentro do sistema por até 12 horas mesmo depois da troca de senha ou desativação.",
    correcao:
      "usuarios.atualizar deve incrementar versaoSessao ao trocar senha/perfil/desativar, e usuarioAtual (src/lib/sessao.ts) deve comparar a versão.",
  },
  "senha-antiga": {
    categoria: "autenticacao",
    severidade: "CRÍTICA",
    titulo: "Senha antiga continua funcionando",
    testado: "Depois da troca de senha, tentou entrar com a senha anterior.",
    impacto: "Trocar a senha não protege nada: quem conhecia a senha antiga continua entrando.",
    correcao: "usuarios.atualizar deve gravar o novo senhaHash quando uma nova senha é informada.",
  },

  // ---------- Headers / arquivos ----------
  "header-powered-by": {
    categoria: "configuracao",
    severidade: "BAIXA",
    titulo: "Servidor anuncia a tecnologia usada",
    testado: "Conferiu se a resposta traz o cabeçalho X-Powered-By.",
    impacto: "Facilita para o invasor saber qual framework e procurar falhas conhecidas daquela tecnologia.",
    correcao: "Mantenha poweredByHeader: false em next.config.ts.",
  },
  "header-clickjacking": {
    categoria: "configuracao",
    severidade: "MÉDIA",
    titulo: "Site pode ser embutido em outro (clickjacking)",
    testado: "Conferiu X-Frame-Options: DENY e Content-Security-Policy frame-ancestors 'none'.",
    impacto:
      "Um site malicioso carregaria o sistema escondido por baixo de botões falsos, fazendo o usuário logado clicar em 'Excluir' sem perceber.",
    correcao: "Mantenha os cabeçalhos de segurança em next.config.ts (headers()).",
  },
  "header-nosniff": {
    categoria: "configuracao",
    severidade: "BAIXA",
    titulo: "Falta X-Content-Type-Options: nosniff",
    testado: "Conferiu o cabeçalho X-Content-Type-Options.",
    impacto: "O navegador poderia 'adivinhar' o tipo de um arquivo e executar como script algo que não deveria.",
    correcao: "Mantenha X-Content-Type-Options: nosniff em next.config.ts.",
  },
  "header-referrer": {
    categoria: "configuracao",
    severidade: "BAIXA",
    titulo: "Falta Referrer-Policy",
    testado: "Conferiu o cabeçalho Referrer-Policy.",
    impacto: "Endereços internos (com ids e filtros) vazariam para sites externos abertos a partir do sistema.",
    correcao: "Mantenha Referrer-Policy em next.config.ts.",
  },
  "arquivos-expostos": {
    categoria: "configuracao",
    severidade: "CRÍTICA",
    titulo: "Arquivos internos acessíveis pelo navegador",
    testado: "Tentou baixar .env, o banco SQLite, package.json, o schema do Prisma e o relatório de design.",
    impacto:
      "Com o .env o invasor obtém o AUTH_SECRET e cria sessões de administrador à vontade; com o banco, leva todos os dados e hashes de senha.",
    correcao: "Nunca coloque esses arquivos em public/; mantenha o banco em prisma/ e segredos só no .env.",
  },
} as const satisfies Record<string, Teste>;

export type IdTeste = keyof typeof CATALOGO;
