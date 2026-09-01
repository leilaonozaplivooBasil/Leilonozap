/**
 * Cliente Slack — operações completas de messaging
 * Transição de webhook (receive-only) para Bot Token (full read/write)
 *
 * Suporta:
 * - Postar mensagens em canais específicos
 * - Editar mensagens existentes
 * - Deletar mensagens
 * - Adicionar reações
 * - Listar canais e membros
 * - Enviar mensagens em threads
 *
 * Autenticação: Bearer token do Slack Bot (não webhook)
 */

/**
 * Resultado de uma chamada à API do Slack.
 *
 * ⚠️ `data` é a RESPOSTA INTEIRA do Slack, não um sub-objeto. O Slack devolve os
 * campos no topo do JSON — `chat.postMessage` → `{ok, channel, ts, message}`,
 * `conversations.list` → `{ok, channels}`, `files.getUploadURLExternal` →
 * `{ok, upload_url, file_id}`. Ele NUNCA devolve uma chave `data`.
 *
 * Até 01/09/2026 `request()` devolvia o JSON cru já tipado como este objeto, e
 * todo mundo que lia `.data` lia `undefined` — em silêncio, porque `ok` vinha
 * `true`. Isso derrubava, sempre e mesmo com token perfeito: o upload de imagem
 * (`documentar_no_slack`), o `ts` de retorno de quem posta (sem ele não dá pra
 * editar nem deletar depois), a busca de canal por nome e o envio de DM.
 */
export type SlackApiResult<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

export type SlackMessage = {
  ts?: string; // timestamp único de cada mensagem
  channel?: string;
  thread_ts?: string;
  text?: string;
  user?: string;
  username?: string;
};

export type SlackChannel = {
  id: string;
  name: string;
  is_member?: boolean;
  created?: number;
  creator?: string;
};

export class SlackClient {
  private baseUrl = 'https://slack.com/api';
  private token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error('Slack Bot Token é obrigatório');
    }
    this.token = token;
  }

  /**
   * Requisição genérica para API Slack
   */
  private async request<T = any>(
    method: string,
    params: Record<string, any> = {}
  ): Promise<SlackApiResult<T>> {
    try {
      const url = `${this.baseUrl}/${method}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const bruto = await response.json() as { ok?: boolean; error?: string };

      if (!bruto?.ok) {
        const erro = bruto?.error || `http_${response.status}`;
        console.error(`[Slack] erro em ${method}:`, erro);
        return { ok: false, error: erro };
      }

      // A resposta INTEIRA vira `data` — é onde o Slack põe ts, channels, etc.
      return { ok: true, data: bruto as T };
    } catch (error) {
      console.error(`[Slack] exceção em ${method}:`, error);
      return { ok: false, error: String((error as Error)?.message || error) };
    }
  }

  /**
   * Requisição em form-urlencoded — alguns endpoints de arquivo do Slack (getUploadURLExternal,
   * completeUploadExternal) esperam esse content-type, não JSON puro.
   */
  private async requestForm<T = any>(
    method: string,
    params: Record<string, any> = {}
  ): Promise<SlackApiResult<T>> {
    try {
      const url = `${this.baseUrl}/${method}`;
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        body.append(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const bruto = await response.json() as { ok?: boolean; error?: string };
      if (!bruto?.ok) {
        const erro = bruto?.error || `http_${response.status}`;
        console.error(`[Slack] erro em ${method}:`, erro);
        return { ok: false, error: erro };
      }
      return { ok: true, data: bruto as T };
    } catch (error) {
      console.error(`[Slack] exceção em ${method}:`, error);
      return { ok: false, error: String((error as Error)?.message || error) };
    }
  }

  /**
   * Resolve nome de canal ("pedidos", "#pedidos") para o ID (C0123456789) — alguns endpoints
   * (files.completeUploadExternal) exigem ID, não aceitam nome. Se já parecer um ID, devolve
   * direto sem gastar a chamada de listagem.
   */
  async resolveChannelId(channel: string): Promise<string> {
    const semHash = channel.replace(/^#/, '');
    if (/^[CGD][A-Z0-9]{8,}$/.test(semHash)) return semHash; // já é um ID
    const encontrado = await this.findChannel(semHash);
    if (encontrado?.id) return encontrado.id;
    console.warn(`[Slack] não encontrei o canal "${channel}" na listagem — usando o nome como veio.`);
    return semHash;
  }

  /**
   * Postar mensagem em um canal
   * @param channel ID ou nome do canal (e.g., '#top-tech-digital' ou 'C1234567890')
   * @param text Conteúdo da mensagem
   * @param options Opções adicionais (thread_ts, blocks, attachments, etc)
   */
  async postMessage(
    channel: string,
    text: string,
    options: Record<string, any> = {}
  ): Promise<SlackApiResult<SlackMessage>> {
    return this.request('chat.postMessage', {
      channel,
      text,
      ...options,
    });
  }

  /**
   * Postar mensagem em thread
   * @param channel ID ou nome do canal
   * @param thread_ts Timestamp da mensagem pai (obtida de uma mensagem anterior)
   * @param text Conteúdo da resposta
   */
  async postThreadMessage(
    channel: string,
    thread_ts: string,
    text: string,
    options: Record<string, any> = {}
  ): Promise<SlackApiResult<SlackMessage>> {
    return this.postMessage(channel, text, {
      thread_ts,
      ...options,
    });
  }

  /**
   * Editar mensagem existente
   * @param channel ID ou nome do canal
   * @param ts Timestamp da mensagem (obtida via postMessage ou conversationHistory)
   * @param text Novo conteúdo
   */
  async updateMessage(
    channel: string,
    ts: string,
    text: string,
    options: Record<string, any> = {}
  ): Promise<SlackApiResult<SlackMessage>> {
    return this.request('chat.update', {
      channel,
      ts,
      text,
      ...options,
    });
  }

  /**
   * Deletar mensagem
   * @param channel ID ou nome do canal
   * @param ts Timestamp da mensagem
   */
  async deleteMessage(
    channel: string,
    ts: string
  ): Promise<SlackApiResult<void>> {
    return this.request('chat.delete', {
      channel,
      ts,
    });
  }

  /**
   * Adicionar reação (emoji) a uma mensagem
   * @param channel ID ou nome do canal
   * @param ts Timestamp da mensagem
   * @param emoji Nome do emoji (sem colons: 'thumbsup', não ':thumbsup:')
   */
  async addReaction(
    channel: string,
    ts: string,
    emoji: string
  ): Promise<SlackApiResult<void>> {
    return this.request('reactions.add', {
      channel,
      timestamp: ts,
      name: emoji,
    });
  }

  /**
   * Remover reação de uma mensagem
   */
  async removeReaction(
    channel: string,
    ts: string,
    emoji: string
  ): Promise<SlackApiResult<void>> {
    return this.request('reactions.remove', {
      channel,
      timestamp: ts,
      name: emoji,
    });
  }

  /**
   * Listar canais do workspace
   * @param limit Máximo de canais a retornar (default: 200)
   */
  async listChannels(limit = 200): Promise<SlackApiResult<{ channels: SlackChannel[] }>> {
    // `types` é obrigatório para enxergar canal PRIVADO — sem ele o Slack devolve
    // só os públicos. O canal de registro do time (#top-tech-leilão-nozap) é
    // privado: sem esta linha ele não existe para o bot, e resolveChannelId cai
    // no nome, que files.completeUploadExternal recusa.
    return this.request('conversations.list', {
      limit,
      exclude_archived: true,
      types: 'public_channel,private_channel',
    });
  }

  /**
   * Buscar canal por nome
   */
  async findChannel(name: string): Promise<SlackChannel | null> {
    const result = await this.listChannels();
    const canais = result.data?.channels;
    if (!result.ok || !Array.isArray(canais)) return null;

    const normalizado = name.toLowerCase().replace(/^#/, '');
    return canais.find((ch) => ch.name?.toLowerCase() === normalizado) || null;
  }

  /**
   * Obter informações de um canal
   */
  async getChannelInfo(channel: string): Promise<SlackApiResult<SlackChannel>> {
    return this.request('conversations.info', {
      channel,
    });
  }

  /**
   * Listar membros de um canal
   */
  async listChannelMembers(channel: string, limit = 100): Promise<SlackApiResult<string[]>> {
    return this.request('conversations.members', {
      channel,
      limit,
    });
  }

  /**
   * Obter histórico de mensagens de um canal
   * @param channel ID ou nome do canal
   * @param limit Número de mensagens (default: 10, max: 100)
   */
  async getConversationHistory(
    channel: string,
    limit = 10
  ): Promise<SlackApiResult<SlackMessage[]>> {
    return this.request('conversations.history', {
      channel,
      limit,
    });
  }

  /**
   * Obter histórico de uma thread
   * @param channel ID ou nome do canal
   * @param thread_ts Timestamp da mensagem pai
   */
  async getThreadReplies(
    channel: string,
    thread_ts: string,
    limit = 10
  ): Promise<SlackApiResult<SlackMessage[]>> {
    return this.request('conversations.replies', {
      channel,
      ts: thread_ts,
      limit,
    });
  }

  /**
   * Obter informações de um usuário
   */
  async getUserInfo(user: string): Promise<SlackApiResult<any>> {
    return this.request('users.info', {
      user,
    });
  }

  /**
   * Buscar usuário por email
   */
  async lookupUserByEmail(email: string): Promise<SlackApiResult<any>> {
    return this.request('users.lookupByEmail', {
      email,
    });
  }

  /**
   * Listar usuários do workspace
   */
  async listUsers(limit = 100): Promise<SlackApiResult<any[]>> {
    return this.request('users.list', {
      limit,
    });
  }

  /**
   * Enviar mensagem direta (DM) a um usuário
   * @param user User ID ou email
   * @param text Conteúdo da mensagem
   */
  async sendDirectMessage(
    user: string,
    text: string,
    options: Record<string, any> = {}
  ): Promise<SlackApiResult<SlackMessage>> {
    // Primeiro, abrir/obter a conversação direta
    const dmResult = await this.request<{ channel?: { id?: string } }>('conversations.open', {
      users: user,
    });

    // conversations.open devolve `channel` como OBJETO ({id: 'D123', ...}), não
    // como string — passar o objeto direto pro postMessage não abre DM nenhuma.
    const canalDm = dmResult.data?.channel?.id;
    if (!dmResult.ok || !canalDm) {
      return { ok: false, error: dmResult.error || `Não foi possível abrir DM com ${user}` };
    }

    return this.postMessage(canalDm, text, options);
  }

  /**
   * Postar usando blocos (rich formatting)
   * Sintaxe Block Kit do Slack: https://api.slack.com/block-kit
   */
  async postBlocks(
    channel: string,
    blocks: any[],
    text = 'Mensagem formatada'
  ): Promise<SlackApiResult<SlackMessage>> {
    return this.postMessage(channel, text, {
      blocks,
    });
  }

  /**
   * Postar com anexos (attachments)
   * Sintaxe legada mas ainda suportada
   */
  async postWithAttachments(
    channel: string,
    text: string,
    attachments: any[]
  ): Promise<SlackApiResult<SlackMessage>> {
    return this.postMessage(channel, text, {
      attachments,
    });
  }

  /**
   * Subir um arquivo (ex: imagem de capa) e postar num canal, com legenda opcional.
   * Usa o fluxo atual do Slack (files.upload foi descontinuado em 2025):
   *   1. files.getUploadURLExternal — pede uma URL de upload temporária
   *   2. POST dos bytes nessa URL
   *   3. files.completeUploadExternal — finaliza e publica no canal, com legenda (initial_comment)
   *
   * @param channel Nome ou ID do canal — resolvido pra ID automaticamente
   * @param fileBytes Conteúdo do arquivo
   * @param filename Nome do arquivo (define a extensão que o Slack usa pra preview)
   * @param options.initial_comment Texto que acompanha o arquivo (a "legenda" do post)
   * @param options.title Título do arquivo dentro do Slack
   */
  async uploadFile(
    channel: string,
    fileBytes: Uint8Array,
    filename: string,
    options: { initial_comment?: string; title?: string } = {}
  ): Promise<SlackApiResult<any>> {
    try {
      const urlResp = await this.requestForm<{ upload_url: string; file_id: string }>(
        'files.getUploadURLExternal',
        { filename, length: fileBytes.length }
      );
      if (!urlResp.ok || !urlResp.data) {
        return { ok: false, error: urlResp.error || 'falha ao obter URL de upload do Slack' };
      }
      const { upload_url, file_id } = urlResp.data;

      const form = new FormData();
      form.append('file', new Blob([fileBytes]), filename);
      const uploadResp = await fetch(upload_url, { method: 'POST', body: form });
      if (!uploadResp.ok) {
        return { ok: false, error: `upload do arquivo falhou: HTTP ${uploadResp.status}` };
      }

      const canalId = await this.resolveChannelId(channel);
      const completeResp = await this.requestForm('files.completeUploadExternal', {
        files: [{ id: file_id, title: options.title || filename }],
        channel_id: canalId,
        initial_comment: options.initial_comment,
      });
      return completeResp;
    } catch (error) {
      console.error('[Slack] exceção em uploadFile:', error);
      return { ok: false, error: String((error as Error)?.message || error) };
    }
  }

  /**
   * Criar atalho/pin numa mensagem
   */
  async pinMessage(
    channel: string,
    ts: string
  ): Promise<SlackApiResult<void>> {
    return this.request('pins.add', {
      channel,
      timestamp: ts,
    });
  }

  /**
   * Remover pin de uma mensagem
   */
  async unpinMessage(
    channel: string,
    ts: string
  ): Promise<SlackApiResult<void>> {
    return this.request('pins.remove', {
      channel,
      timestamp: ts,
    });
  }
}

/**
 * Factory para criar cliente Slack com token do env
 */
export function criarClienteSlack(token?: string): SlackClient | null {
  const slackToken = token || Deno.env.get('SLACK_BOT_TOKEN');
  if (!slackToken) {
    console.warn('[Slack] SLACK_BOT_TOKEN não configurado — funcionalidades Slack desabilitadas');
    return null;
  }
  try {
    return new SlackClient(slackToken);
  } catch (error) {
    console.error('[Slack] erro ao criar cliente:', error);
    return null;
  }
}
