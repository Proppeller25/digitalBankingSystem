import mongoose from "mongoose";

const bvnSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    bvn: {
      type: String,
      required: true,
      unique: true
    },

    firstName: {
      type: String,
      required: true,
      trim: true
    },

    lastName: {
      type: String,
      required: true,
      trim: true
    },

    dob: {
      type: Date,
      required: true
    },

    phone: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending"
    },

    provider: {
      type: String,
      default: "nibss"
    },

    rawResponse: {
      type: Object // store full NIBSS response for audit
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Bvn", bvnSchema)