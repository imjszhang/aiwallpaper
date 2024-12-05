import axios, { AxiosInstance } from "axios";

interface DifyOptions {
  apiKey: string;
  baseURL: string;
}

class Dify {
  private apiKey: string;
  private client: AxiosInstance;

  constructor(options: DifyOptions) {
    this.apiKey = options.apiKey;
    this.client = axios.create({
      baseURL: options.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  // 发送对话消息
  async sendMessage({
    query,
    inputs = {},
    responseMode = "streaming",
    user,
    conversationId = "",
    files = [],
    autoGenerateName = true,
  }: {
    query: string;
    inputs?: object;
    responseMode?: "streaming" | "blocking";
    user: string;
    conversationId?: string;
    files?: Array<{
      type: string;
      transfer_method: "remote_url" | "local_file";
      url?: string;
      upload_file_id?: string;
    }>;
    autoGenerateName?: boolean;
  }) {
    const response = await this.client.post("/chat-messages", {
      query,
      inputs,
      response_mode: responseMode,
      user,
      conversation_id: conversationId,
      files,
      auto_generate_name: autoGenerateName,
    });
    return response.data;
  }

  // 上传文件
  async uploadFile({
    file,
    user,
  }: {
    file: File | Blob;
    user: string;
  }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user", user);

    const response = await this.client.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // 停止响应
  async stopResponse(taskId: string, user: string) {
    const response = await this.client.post(`/chat-messages/${taskId}/stop`, {
      user,
    });
    return response.data;
  }

  // 消息反馈
  async sendFeedback({
    messageId,
    rating,
    user,
  }: {
    messageId: string;
    rating: "like" | "dislike" | null;
    user: string;
  }) {
    const response = await this.client.post(`/messages/${messageId}/feedbacks`, {
      rating,
      user,
    });
    return response.data;
  }

  // 获取下一轮建议问题列表
  async getSuggestedQuestions(messageId: string, user: string) {
    const response = await this.client.get(
      `/messages/${messageId}/suggested`,
      {
        params: { user },
      }
    );
    return response.data;
  }

  // 获取会话历史消息
  async getConversationMessages({
    conversationId,
    user,
    firstId = null,
    limit = 20,
  }: {
    conversationId: string;
    user: string;
    firstId?: string | null;
    limit?: number;
  }) {
    const response = await this.client.get("/messages", {
      params: {
        conversation_id: conversationId,
        user,
        first_id: firstId,
        limit,
      },
    });
    return response.data;
  }

  // 获取会话列表
  async getConversations({
    user,
    lastId = null,
    limit = 20,
    sortBy = "-updated_at",
  }: {
    user: string;
    lastId?: string | null;
    limit?: number;
    sortBy?: string;
  }) {
    const response = await this.client.get("/conversations", {
      params: {
        user,
        last_id: lastId,
        limit,
        sort_by: sortBy,
      },
    });
    return response.data;
  }

  // 删除会话
  async deleteConversation(conversationId: string, user: string) {
    const response = await this.client.delete(
      `/conversations/${conversationId}`,
      {
        data: { user },
      }
    );
    return response.data;
  }

  // 会话重命名
  async renameConversation({
    conversationId,
    name = "",
    autoGenerate = false,
    user,
  }: {
    conversationId: string;
    name?: string;
    autoGenerate?: boolean;
    user: string;
  }) {
    const response = await this.client.post(
      `/conversations/${conversationId}/name`,
      {
        name,
        auto_generate: autoGenerate,
        user,
      }
    );
    return response.data;
  }

  // 语音转文字
  async audioToText({ file, user }: { file: File | Blob; user: string }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user", user);

    const response = await this.client.post("/audio-to-text", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // 文字转语音
  async textToAudio({
    text,
    messageId,
    user,
  }: {
    text?: string;
    messageId?: string;
    user: string;
  }) {
    const response = await this.client.post("/text-to-audio", {
      text,
      message_id: messageId,
      user,
    });
    return response.data;
  }

  // 获取应用基本信息
  async getAppInfo(user: string) {
    const response = await this.client.get("/info", {
      params: { user },
    });
    return response.data;
  }

  // 获取应用参数
  async getAppParameters(user: string) {
    const response = await this.client.get("/parameters", {
      params: { user },
    });
    return response.data;
  }

  // 获取应用Meta信息
  async getAppMeta(user: string) {
    const response = await this.client.get("/meta", {
      params: { user },
    });
    return response.data;
  }
}

export function getDifyClient() {
  const dify = new Dify({
    apiKey: process.env.DIFY_API_KEY || "",
    baseURL: process.env.DIFY_BASE_URL || "",
  });
  return dify;
}

export default Dify;