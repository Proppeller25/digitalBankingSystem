import User from '../models/Users.js'
import Bvn from '../models/Bvn.js'
import Transaction from '../models/Transactions.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import type { Request, Response } from "express";

import { createNibssAccount, accountEnquiry, getAllAccounts, getAccountBalance, transfer, insertBvn, getTransferStatus, validateBvn } from '../services/nibbsService.js'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Internal server error'

const generateBVN = () => {
  return Math.floor(10000000000 + Math.random() * 90000000000).toString()
}

const insertBVN = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      phone
    } = req.body

    if (!firstName || !lastName || !dateOfBirth || !phone) {
      return res.status(400).json({ message: 'Missing or wrong BVN parameters' })
    }

    const normalizedBvn = String(generateBVN)

    if (!/^\d{11}$/.test(normalizedBvn)) {
      return res.status(400).json({ message: 'BVN must be exactly 11 digits' })
    }

    const existingBvn = await Bvn.findOne({ bvn: normalizedBvn })
    if (existingBvn) {
      return res.status(409).json({ message: 'BVN already exists' })
    }

    const bvnRes = await insertBvn({
      bvn: normalizedBvn,
      firstName,
      lastName,
      dob: dateOfBirth,
      phone
    })

    const status: 'verified' | 'pending' =
      bvnRes.message?.includes('successfully') ? 'verified' : 'pending'

    const newBvnRecord = {
      bvn: bvnRes.bvn || normalizedBvn,
      firstName,
      lastName,
      dob: dateOfBirth,
      phone,
      status,
      provider: 'nibss',
      rawResponse: bvnRes
    }

    const newBvn = await Bvn.create(newBvnRecord)

    res.status(201).json({
      message: 'BVN inserted successfully. Proceed to account creation.',
      bvn: newBvn
    })
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) })
  }
}

const createAccount = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      email,
      phone,
      password,
      transactionPin,
      bvn
    } = req.body

    if (!firstName || !lastName || !dateOfBirth || !email || !phone || !password || !transactionPin || !bvn) {
      return res.status(400).json({ message: 'Missing or wrong parameters' })
    }

    const normalizedBvn = String(bvn)
    const existingBvn = await Bvn.findOne({ bvn: normalizedBvn })

    if (!existingBvn) {
      return res.status(400).json({ message: 'BVN not found. Please insert BVN before creating an account.' })
    }

    const isValidBvn = await validateBvn(normalizedBvn)

    if (!isValidBvn) {
      return res.status(404).json({ message: 'invalid BVN' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPin = await bcrypt.hash(transactionPin, salt)

    const accountRes = await createNibssAccount({
      kycType: 'bvn',
      kycID: normalizedBvn,
      dob: dateOfBirth
    })

    if (!accountRes.account?.accountNumber) {
      return res.status(502).json({ message: 'Unable to create NIBSS account', accountRes })
    }

    const newRecord = {
      firstName,
      lastName,
      dateOfBirth,
      email,
      phone,
      password,
      bvn: normalizedBvn,
      accountNumber: accountRes.account?.accountNumber,
      transactionPin: hashedPin
    }

    const newUser = await User.create(newRecord)

    existingBvn.user = newUser._id
    existingBvn.status = 'verified'
    await existingBvn.save()

    res.status(201).json({
      message: 'User Account created successfully',
      user: newUser,
      bvn: existingBvn,
      AccountDetails: accountRes
    })
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) })
  }
}

const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required parameters' })
    }

    const existingUser = await User.findOne({ email })
    if (!existingUser) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isValidPassword = await bcrypt.compare(password, existingUser.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return res.status(500).json({ message: 'JWT Secret not configured' })
    }

    // ✅ Force secret to be treated as a string (narrows type)
    const secretKey: string = secret

    // ✅ Define options with explicit type
    const expiresIn: any = process.env.JWT_EXPIRES_IN || '1h'
    const options: jwt.SignOptions = { expiresIn }

    // Payload – never include sensitive data like transactionPin or bvn
    const payload = {
      id: existingUser._id,
      email: existingUser.email,
      name: existingUser.firstName,
      accountNumber: existingUser.accountNumber,
      hasAdminAccess: existingUser.hasAdminAccess || false,
    }

    const token = jwt.sign(payload, secretKey, options)

    res.cookie('Authorization', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000,
    })
    res.setHeader('Authorization', `Bearer ${token}`)
    res.setHeader('x-auth-token', token)
    res.status(200).json({ message: 'Login successful' })

  } catch (error) {
    console.error('userLogin error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const userLogOut = async (_req: Request, res: Response) => {
  try {
    res.clearCookie('Authorization', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
    })
    res.setHeader('Authorization', '')
    res.setHeader('x-auth-token', '')
    res.status(200).json({message: 'Logout successful'})
  } catch (error) {
    console.error('userLogOut error:', error)
    res.status(500).json({message: 'Internal server error'})
  }
}

const getAccounts = async (req: Request, res: Response) => {
  try {
    const user = req.user

    if (!user)
      return res.status(401).json({message: 'Unauthenticated'})

    if(!user.hasAdminAccess)
      return res.status(401).json({message: 'insufficient permissions'})
    const accounts = await getAllAccounts()

    res.status(200).json({accounts})
  } catch (error) {
    res.status(500).json({message: 'Internal server error'})
  }
}

const transferMoney = async (req: Request, res: Response) => {
  try {
    const {user} = req

    if (!user)
      return res.status(401).json({message: 'Unauthenticated'})

    const {to, amount, currency, transactionPin} = req.body

    if (
      typeof to !== 'string' ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      typeof transactionPin !== 'string'
    ) {
      return res.status(400).json({message: 'Invalid transfer parameters'})
    }

    const from = user.accountNumber

    const isValidAccount = await accountEnquiry(to)

    if(!isValidAccount.accountNumber)
      return res.status(404).json({message: 'This account does not exist'})

    const accountBalance = await getAccountBalance(from)

    const userRecord = await User.findById(user.id).select('+transactionPin')

    if (!userRecord?.transactionPin)
      return res.status(401).json({message: 'Transaction PIN is not configured'})

    const isValidPin = await bcrypt.compare(transactionPin, userRecord.transactionPin)

    
    if(accountBalance.balance < amount)
      return res.status(400).json({message:'insufficient funds'})
    
    if (!isValidPin)
        return res.status(401).json({ message: 'Invalid password' })

    const transferRes = await transfer(
      {
        amount,
        to,
        from
      }
    )

    const type: 'credit' | 'debit' = 'debit'

    const transactionRecord = {
      user: user.id,
      amount,
      from,
      to,
      currency,
      type,
      status: transferRes.status.toLowerCase(),
      referenceId: transferRes.reference
    }

    if(!transferRes.reference)
      return res.status(502).json({message: 'Transaction failed', transferRes})

    await Transaction.create(transactionRecord)

    res.status(200).json({message: `Transfer to ${isValidAccount.accountName} successful`, transfer: transferRes})
  } catch (error) {
    res.status(500).json({message: getErrorMessage(error)})
  }
}

const getTransactionStatus = async (req: Request, res: Response) => {
  try {
    const {user} = req

    if (!user)
      return res.status(401).json({message: 'Unauthenticated'})

    const {transactionId} = req.params 
    
    if(!transactionId)
      return res.status(400).json({message: 'Transaction ID is required'})
    
    const normalizedTransactionId = Array.isArray(transactionId)
      ? transactionId[0]
      : transactionId

    if (!normalizedTransactionId)
      return res.status(400).json({message: 'Transaction ID is required'})

    const transaction = await getTransferStatus(normalizedTransactionId)
    const type: 'credit' | 'debit' = 
    user.accountNumber === transaction.from
    ? 'debit'
    : 'credit'

    const isExistingTransaction = await Transaction.findOne({ referenceId: transactionId })
    
    if(transaction.status.toLowerCase() === 'success' && isExistingTransaction) 
      return res.status(409).json({message: 'This transaction is in record already'})

    
      const transactionRecord = {
        user: user.id,
        amount: transaction.amount,
        from: transaction.senderAccount,
        to: transaction.receiverAccount,
        currency: transaction.currency || 'naira',
        type,
        status: transaction.status.toLowerCase(),
        referenceId: transaction.reference
      }

      if (!isExistingTransaction) {
        await Transaction.create(transactionRecord)
        res.status(200).json({message: 'Transaction status retrieved and saved', transaction})
      } else if(isExistingTransaction.status !== 'success' && transaction.status.toLowerCase() === 'success') {
         isExistingTransaction.status = 'success'
         await isExistingTransaction.save()
         res.status(200).json({message: 'Transaction status retrieved and updated', transaction})
      }
  } catch (error) {
    res.status(500).json({message: getErrorMessage(error)})
  }
}

const checkBalance = async (req: Request, res: Response) => {
  try {
    const { user } = req

    if (!user) {
      return res.status(401).json({ message: 'Unauthenticated' })
    }

    const accountBalance = await getAccountBalance(user.accountNumber)

    return res.status(200).json({
      message: 'Account query successful',
      accountBalance
    })
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) })
  }
}

export {createAccount, getAccounts, transferMoney, getTransactionStatus, userLogOut, userLogin, checkBalance, insertBVN}
