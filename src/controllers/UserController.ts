import User from '../models/Users.js'
import Bvn from '../models/Bvn.js'
import Transaction from '../models/Transactions.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import type { Request, Response } from "express";

import { createNibssAccount, accountEnquiry, getAllAccounts, getAccountBalance, transfer, insertBvn, getTransferStatus, validateBvn } from '../services/nibbsService.js'

const generateBVN = () => {
  return Math.floor(10000000000 + Math.random() * 90000000000).toString()
}

interface AuthenticatedUser {
  role: string
  id: string
  accountNumber: string
  hasAdminAccess: boolean
  bvn: string
  transactionPin: string
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser
}

const createAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      firstName, 
      lastName, 
      dateOfBirth, 
      email,
      phone,
      password,
      transactionPin
    } = req.body

    const bvn = generateBVN()
    const salt = await bcrypt.genSalt(10)
    const hashedPin = await bcrypt.hash(transactionPin, salt)

    if(!firstName || !lastName || !dateOfBirth || !email || !phone || !password || !transactionPin)
      return res.status(400).json({message: 'Missing or wrong parameters'})
    
    
    const bvnRes = await insertBvn(
      {
        bvn, 
        firstName,
        lastName,
        dob:dateOfBirth,
        phone
      }
    )

    const isValidBvn = await validateBvn(bvn)

    if(!isValidBvn) 
      return res.status(404).json({message: 'invalid BVN'})
    
    const accountRes = await createNibssAccount(
      {
        kycType: 'bvn',
        kycID: bvn,
        dob: dateOfBirth
      }
    )

    const newRecord = {
      firstName, 
      lastName, 
      dateOfBirth, 
      email,
      phone,
      password,
      bvn,
      accountNumber: accountRes.accountNumber, 
      transactionPin: hashedPin
    }

    const newUser = await User.create(newRecord)

    const status: 'verified' | 'pending' =
    bvnRes.message.includes('successfully')
    ? 'verified'
    : 'pending';

    
    const newBvnRecord = {
      user: newUser._id,
      bvn: bvnRes.bvn || bvn,
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
      message: 'User Account created successfully',
      user: newUser,
      bvn: newBvn,
      AccountDetails: accountRes
    })

  } catch (error) {
    res.status(500).json({message: 'Internal server error'})
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
      return res.status(401).json({ message: 'Invalid password' })
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return res.status(500).json({ message: 'JWT Secret not configured' })
    }

    // ✅ Force secret to be treated as a string (narrows type)
    const secretKey: string = secret

    // ✅ Define options with explicit type
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h'
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

const getAccounts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user

    if(!user.hasAdminAccess)
      return res.status(401).json({message: 'insufficient permissions'})
    const accounts = await getAllAccounts()

    res.status(200).json({accounts})
  } catch (error) {
    res.status(500).json({message: 'Internal server error'})
  }
}

const transferMoney = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {user} = req
    const {to, amount, currency, transactionPin} = req.body

    const from = user.accountNumber

    const isValidAccount = await accountEnquiry(to)

    if(!isValidAccount.accountNumber)
      return res.status(404).json({message: 'This account does not exist'})

    const accountBalance = await getAccountBalance(from)

    const isValidPin = await bcrypt.compare(transactionPin, user.transactionPin)

    
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

    const type: 'credit' | 'debit' = 'credit'

    const transactionRecord = {
      user: user.id,
      amount,
      from,
      to,
      currency,
      type,
      status: transferRes.status,
      referenceId: transferRes.transactionId
    }

    await Transaction.create(transactionRecord)

    res.status(200).json({message: 'Transfer successful', transfer: transferRes})
  } catch (error) {
    res.status(500).json({message: error || 'Internal server error'})
  }
}

const getTransactionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {user} = req
    const {transactionId} = req.params 
    
    if(!transactionId)
      return res.status(400).json({message: 'Transaction ID is required'})
    
    const normalizedTransactionId = Array.isArray(transactionId)
      ? transactionId[0]
      : transactionId

    const transaction = await getTransferStatus(normalizedTransactionId)
    const type: 'credit' | 'debit' = 
    user.accountNumber === transaction.from
    ? 'debit'
    : 'credit'
    
    if(transaction.status === 'success'){
      const transactionRecord = {
        user: user.id,
        amount: transaction.amount,
        from: transaction.from,
        to: transaction.to,
        currency: transaction.currency || 'naira',
        type,
        status: transaction.status,
        referenceId: transaction.transactionId
      }
      
      await Transaction.create(transactionRecord)
    }

    res.status(200).json({message: 'Transaction status retrieved', transaction})
  } catch (error) {
    res.status(500).json({message: error || 'Internal server error'})
  }
}

export {createAccount, getAccounts, transferMoney, getTransactionStatus}
