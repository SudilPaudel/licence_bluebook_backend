const mongoose = require('mongoose');

const MarqueeSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    default: 'Government of Nepal - Ministry of Physical Infrastructure and Transport - Department of Transport Management - Nepal'
  }
}, {
  timestamps: true
});

const MarqueeModel = mongoose.model('Marquee', MarqueeSchema);

module.exports = MarqueeModel; 