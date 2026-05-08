const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from:      { type: String, required: true },
    to:        { type: String, default: null },      // null for group messages
    toGroup:   { type: String, default: null },      // group id for group messages
    text:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }
);

messageSchema.index({ from: 1, to: 1 });
messageSchema.index({ toGroup: 1 });

module.exports = mongoose.model("Message", messageSchema);
