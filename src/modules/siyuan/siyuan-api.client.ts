type SiYuanEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

type NotebookInfo = {
  id: string;
  name: string;
  icon: string;
  sort: number;
  closed: boolean;
};

export class SiYuanApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  async lsNotebooks(): Promise<NotebookInfo[]> {
    const response = await this.post<{ notebooks: NotebookInfo[] }>("/api/notebook/lsNotebooks", {});
    return response.notebooks || [];
  }

  async createNotebook(name: string): Promise<NotebookInfo> {
    const response = await this.post<{ notebook: NotebookInfo }>("/api/notebook/createNotebook", { name });
    return response.notebook;
  }

  async getIDsByHPath(notebook: string, path: string): Promise<string[]> {
    return this.post<string[]>("/api/filetree/getIDsByHPath", { notebook, path });
  }

  async getHPathByID(id: string): Promise<string> {
    return this.post<string>("/api/filetree/getHPathByID", { id });
  }

  async getPathByID(id: string): Promise<{ notebook: string; path: string }> {
    return this.post<{ notebook: string; path: string }>("/api/filetree/getPathByID", { id });
  }

  async createDocWithMd(notebook: string, path: string, markdown: string): Promise<string> {
    return this.post<string>("/api/filetree/createDocWithMd", { notebook, path, markdown });
  }

  async removeDocByID(id: string): Promise<void> {
    await this.post<null>("/api/filetree/removeDocByID", { id });
  }

  async exportMdContent(id: string): Promise<{ hPath: string; content: string }> {
    return this.post<{ hPath: string; content: string }>("/api/export/exportMdContent", { id });
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(new URL(endpoint, this.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${this.token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`SiYuan API request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as SiYuanEnvelope<T>;

    if (payload.code !== 0) {
      throw new Error(`SiYuan API error: ${payload.msg || payload.code}`);
    }

    return payload.data;
  }
}
