require('dotenv').config()
import axios from 'axios'

const baseUrl = process.env.NIBSS_BASE_URL

export interface CreateAccountPayload {
  kycType?: string,
  kycID?: string,
  dob?: string
}

interface BVN {
  bvn: string, 
  firstName: string,
  lastName: string,
  dob:string,
  phone: string
}

interface Transfer {
  from?: string,
  to?: string,
  amount?: string
}


const getToken = async () => {
  try {
    const body = {     
    "apiKey": process.env.NIBSS_API_KEY,
    "apiSecret": process.env.NIBSS_API_SECRET
  } 
  const response = await axios.post(
    `${baseUrl}/api/auth/token`,
    body
  )


  const isOk = response.status >= 200 && response.status < 300

  if(!isOk)
    throw new Error('Wrong Credentials')
  const token = response.data.token
  return token
  } catch (error) {
    throw new Error(`Error: ${error}` || 'Server Error')
    }
}

const insertBvn = async (payload: BVN) => {
  try {
    const token = await getToken()
    const response = await axios.post(
      `${baseUrl}/api/insertBvn`,
      payload,
      {
        headers:{
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = await response.data
    return data
  } catch (error) {
    throw new Error(`Error: ${error}` || 'Server Error')
  }
}

const validateBvn = async (bvn:string) => {
  try {
    const token = await getToken()
    const response = await axios.post(
      `${baseUrl}/api/validateBvn `,
      {
        bvn
      },
      {
        headers:{
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = await response.data
    return data
  } catch (error) {
    throw new Error(`Error: ${error}` || 'Server Error')
  }
}

const createNibssAccount = async (payload: CreateAccountPayload) => {
  try {
    const token = await getToken()
    const response = await axios.post(
      `${baseUrl}/api/account/create`,
      payload,
      {
        headers:{
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = response.data
    return data
  } catch (error) {
    throw new Error(`Error: ${error}` || 'Server Error')
  }
}

const accountEnquiry = async (accountNumber:string) => {
  try {
    const token = await getToken()
    const response = await axios.get(
      `${baseUrl}/api/account/nameenquiry/${accountNumber}`, 
      {
        headers:{
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = await response.data
    return data
  } catch (error) {
    throw new Error(`Error: ${error}` || `Server Error`)
  }
}

const getAllAccounts = async () => {
  try {
    const token = await getToken()
    const response = await axios.get(
      `${baseUrl}/api/accounts`, 
      {
        headers:{
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = await response.data
    return data
  } catch (error) {
    throw new Error(`Error: ${error}` || `Server Error`)
  }
}

const getAccountBalance = async (accountNumber:string) => {
  try {
    const token = await getToken()
    const response = await axios.get(
      `${baseUrl}/api/account/balance/${accountNumber}`, 
      {
        headers:{
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = await response.data
    return data
  } catch (error) {
    throw new Error(`Error: ${error}` || `Server Error`)
  }
}

const transfer = async (payload: Transfer) => {
  try {
    const token = await getToken()
    const response = await axios.post(
      `${baseUrl}/api/transfer`,
      payload, 
      {
        headers:{
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = await response.data
    return data
  } catch (error) {
    throw new Error(`Error: ${error}` || `Server Error`)
  }
}

const getTransferStatus = async (transactionId?: string) => {
  try {
    const token = await getToken()
    const response = await axios.get(
      `${baseUrl}/api/transaction/${transactionId} `, 
      {
        headers:{
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = await response.data
    return data
  } catch (error) {
    throw new Error(`Error: ${error}` || `Server Error`)
  }
}

export { getToken, createNibssAccount, accountEnquiry, getAllAccounts, getAccountBalance, transfer, insertBvn, getTransferStatus, validateBvn }
