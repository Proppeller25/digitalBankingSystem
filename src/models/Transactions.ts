import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    enums: ['dollar', 'naira'],
    default: 'naira'
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  status: {
    type: String,
    enums: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  referenceId: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
})

export default mongoose.model('Transaction', TransactionSchema)