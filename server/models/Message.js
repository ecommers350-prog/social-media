// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    from_user_id: {
      type: String,
      ref: "User",
      required: true,
    },
    to_user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    // text content
    text: {
      type: String,
      trim: true,
      default: "",
    },

    // type of message
    message_type: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },

    // image / media URL
    media_url: {
      type: String,
      default: "",
    },

    // seen / read flag
    seen: {
      type: Boolean,
      default: false,
    },

    // reply reference (for reply message feature)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
