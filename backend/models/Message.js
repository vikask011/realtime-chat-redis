const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from:      { type: String, required: true },
    to:        { type: String, required: true },
    text:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }
);

messageSchema.index({ from: 1, to: 1 });

module.exports = mongoose.model("Message", messageSchema);
