import User from '../models/Users.js'
import Bvn from '../models/Bvn.js'
import type { Request, Response } from "express";

import { getToken, createNibssAccount, accountEnquiry, getAllAccounts, getAccountBalance, transfer, insertBvn, getTransferStatus, validateBvn } from '../services/nibbsService.js'

const generateBVN = () => {
  return Math.floor(10000000000 + Math.random() * 90000000000).toString()
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
      transactionPin
    } = req.body

    const bvn = generateBVN()

    if(!firstName || !lastName || !dateOfBirth || !email || !phone || !password || !transactionPin)
      return res.status(400).json({message: 'Missing or wrong parameters'})
    
    const newRecord = {
      firstName, 
      lastName, 
      dob: dateOfBirth, 
      email,
      phone,
      password,
      bvn,
      transactionPin
    }
    
  
    const bvnRes = await insertBvn(
      {
        bvn, 
        firstName,
        lastName,
        dob:dateOfBirth,
        phone
      }
    )

    const newUser = await User.create(newRecord)

    const accountRes = await createNibssAccount(
      {
        kycType: 'bvn',
        kycID: bvn,
        dob: dateOfBirth
      }
    )

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

const getUserAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId
    const user = await User.findById(userId)
    if(!user)
      return res.status(404).json({message: 'User not found'})
  } catch (error) {
    res.status(500).json({message: 'Internal server error'})
  }
}