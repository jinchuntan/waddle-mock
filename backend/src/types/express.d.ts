declare global {
  namespace Express {
    interface User {
      id: string
      email: string
      name: string | null
      avatarUrl: string | null
    }
  }
}

export {}
