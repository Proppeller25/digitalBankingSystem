declare global {
  interface AuthenticatedUser {
    id: string
    name: string
    accountNumber: string
    hasAdminAccess: boolean
    email: string
    role?: string
  }

  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

export {}
