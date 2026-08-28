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

      const result = await response.json() as SlackApiResult<T>;

      if (!result.ok) {
        console.error(`[Slack] erro em ${method}:`, result.error);
        return { ok: false, error: result.error };
      }

      return result;
    } catch (error) {
      console.error(`[Slack] exceção em ${method}:`, error);
      return { ok: false, error: String((error as Error)?.message || error) };
    }
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
   * @param limit Máximo de canais a retornar (default: 100)
   */
  async listChannels(limit = 100): Promise<SlackApiResult<SlackChannel[]>> {
    return this.request('conversations.list', {
      limit,
      exclude_archived: true,
    });
  }

  /**
   * Buscar canal por nome
   */
  async findChannel(name: string): Promise<SlackChannel | null> {
    const result = await this.listChannels(100);
    if (!result.ok || !Array.isArray(result.data)) return null;

    const normalizado = name.toLowerCase().replace(/^#/, '');
    return (result.data as any[]).find(
      (ch) => ch.name?.toLowerCase() === normalizado
    ) || null;
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
    const dmResult = await this.request('conversations.open', {
      users: user,
    });

    if (!dmResult.ok || !dmResult.data?.channel) {
      return { ok: false, error: `Não foi possível abrir DM com ${user}` };
    }

    return this.postMessage(dmResult.data.channel, text, options);
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
