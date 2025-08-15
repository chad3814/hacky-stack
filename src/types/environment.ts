export interface Environment {
  id: string;
  name: string;
  description: string | null;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentWithCounts extends Environment {
  _count: {
    secrets: number;
    variables: number;
  };
}

export interface CreateEnvironmentInput {
  name: string;
  description?: string;
}

export interface UpdateEnvironmentInput {
  description?: string | null;
}