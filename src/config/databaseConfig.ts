import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        const URI = process.env.MONGO_URI
        
        if(!URI)
            throw new Error('missing required variables')

        const conn = await mongoose.connect(URI)
        console.log(`MongoDB Connected: ${conn.connection.host}`)
    } catch (error) {
        console.error('Error connecting to MongoDB:', error)
        process.exit(1)
    }
}

export default connectDB