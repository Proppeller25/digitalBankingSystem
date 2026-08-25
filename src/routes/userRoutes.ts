import express from "express";
import auth from '../middleware/auth.js'
import {createAccount, getAccounts, transferMoney, getTransactionStatus, userLogOut, userLogin, checkBalance} from '../controllers/UserController.js' 

const router = express.Router()

router.post('/account', createAccount)

router.get('/account', auth, getAccounts)
router.post('/account/transfer', auth, transferMoney)
router.post('/login', userLogin)
router.post('/logout', auth, userLogOut)
router.get('/account/balance', auth, checkBalance)
router.get('/transaction/:transactionId', auth, getTransactionStatus)

export default router