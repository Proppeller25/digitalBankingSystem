import 'dotenv/config'
import axios from 'axios'

const baseUrl = process.env.NIBSS_BASE_URL

const getBaseUrl = () => {
  if (!baseUrl) {
    throw new Error('NIBSS_BASE_URL is not configured')
  }

  return baseUrl.replace(/\/$/, '')
}

const getServiceError = (operation: string, error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 'network error'
    const details = error.response?.data?.message ?? error.message

    return new Error(`NIBSS ${operation} failed (${status}): ${details}`, { cause: error })
  }

  return error instanceof Error
    ? error
    : new Error(`NIBSS ${operation} failed`, { cause: error })
}

export interface CreateAccountPayload {
  kycType: string
  kycID: string
  dob: string
}

interface BvnPayload {
  bvn: string
  firstName: string
  lastName: string
  dob: string
  phone: string
}

interface TransferPayload {
  from: string
  to: string
  amount: number
}

interface TokenResponse {
  token?: string
}

export interface InsertBvnResponse {
  bvn?: string
  message?: string
}

export interface CreateAccountResponse {
  ok?: boolean
  account?: {
    accountNumber: string
  }
  message: string
}

export interface AccountEnquiryResponse {
  accountNumber?: string
  accountName?: string
  message?: string
}

export interface AccountBalanceResponse {
  balance: number
  message?: string
}

export interface TransferResponse {
  status: string
  reference: string
  amount: number
  from: string
  to: string
  currency?: string
  senderAccount: string
  receiverAccount: string
  message?: string
}

export type ValidateBvnResponse = {
  valid?: boolean
  ok?: boolean
  message?: string
}

export interface AccountResponse {
  _id: string
  accountNumber: string
  accountName: string
  bankCode: string
  fintechId: string
  kycType: string
  kycID: string
  balance: number
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

export interface AccountsResponse {
  count: number
  accounts: AccountResponse[]
  message: string
}

let savedToken: string = '' 

const getToken = async (force = false) => {
  if (savedToken && !force) return savedToken

  try {
    const body = {
      apiKey: process.env.NIBSS_API_KEY,
      apiSecret: process.env.NIBSS_API_SECRET
    }
    const response = await axios.post<TokenResponse>(
      `${getBaseUrl()}/api/auth/token`,
      body
    )
    const token = response.data.token

    if (!token) {
      throw new Error('NIBSS token was missing from the response')
    }

    savedToken = token
    return savedToken
  } catch (error) {
    throw getServiceError('token request', error)
  }
}

if (!savedToken) savedToken = await getToken()

const insertBvn = async (payload: BvnPayload) => {
  try {
    const token = savedToken
    const response = await axios.post<InsertBvnResponse>(
      `${getBaseUrl()}/api/insertBvn`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if(response.data.message === 'Invalid or expired token')
      savedToken = await getToken(true)
    
    return response.data
  } catch (error) {
    throw getServiceError('BVN insertion', error)
  }
}

const validateBvn = async (bvn: string): Promise<ValidateBvnResponse> => {
  try {
    const token = savedToken
    const response = await axios.post<ValidateBvnResponse>(
      `${getBaseUrl()}/api/validateBvn`,
      { bvn },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if(response.data.message === 'Invalid or expired token')
      savedToken = await getToken(true)

    return response.data
  } catch (error) {
    throw getServiceError('BVN validation', error)
  }
}

const createNibssAccount = async (payload: CreateAccountPayload) => {
  try {
    const token = savedToken
    const response = await axios.post<CreateAccountResponse>(
      `${getBaseUrl()}/api/account/create`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if(response.data.message === 'Invalid or expired token')
      savedToken = await getToken(true)

    return response.data
  } catch (error) {
    throw getServiceError('account creation', error)
  }
}

const accountEnquiry = async (accountNumber: string) => {
  try {
    const token = savedToken
    const response = await axios.get<AccountEnquiryResponse>(
      `${getBaseUrl()}/api/account/name-enquiry/${encodeURIComponent(accountNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if(response.data.message === 'Invalid or expired token')
      savedToken = await getToken(true)

    return response.data
  } catch (error) {
    throw getServiceError('account enquiry', error)
  }
}

const getAllAccounts = async (): Promise<AccountsResponse> => {
  try {
    const token = savedToken
    const response = await axios.get<AccountsResponse>(
      `${getBaseUrl()}/api/accounts`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if(response.data.message === 'Invalid or expired token')
      savedToken = await getToken(true)

    return response.data
  } catch (error) {
    throw getServiceError('account listing', error)
  }
}

const getAccountBalance = async (accountNumber: string) => {
  try {
    const token = savedToken
    const response = await axios.get<AccountBalanceResponse>(
      `${getBaseUrl()}/api/account/balance/${encodeURIComponent(accountNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if(response.data.message === 'Invalid or expired token')
      savedToken = await getToken(true)

    return response.data
  } catch (error) {
    throw getServiceError('balance lookup', error)
  }
}

const transfer = async (payload: TransferPayload) => {
  try {
    const token = savedToken
    const response = await axios.post<TransferResponse>(
      `${getBaseUrl()}/api/transfer`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if(response.data.message === 'Invalid or expired token')
      await getToken()

    return response.data
  } catch (error) {
    throw getServiceError('transfer', error)
  }
}

const getTransferStatus = async (transactionId: string) => {
  try {
    const token = savedToken
    const response = await axios.get<TransferResponse>(
      `${getBaseUrl()}/api/transaction/${encodeURIComponent(transactionId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if(response.data.message === 'Invalid or expired token')
      await getToken()

    return response.data
  } catch (error) {
    throw getServiceError('transaction status lookup', error)
  }
}

export {
  getToken,
  createNibssAccount,
  accountEnquiry,
  getAllAccounts,
  getAccountBalance,
  transfer,
  insertBvn,
  getTransferStatus,
  validateBvn
}
