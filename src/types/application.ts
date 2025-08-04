export interface Application {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ApplicationWithHealth extends Application {
  isHealthy: boolean
}