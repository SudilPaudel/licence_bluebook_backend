const MarqueeModel = require('./marquee.model');

const getMarquee = async (req, res, next) => {
  try {
    let marquee = await MarqueeModel.findOne();
    if (!marquee) {
      marquee = await MarqueeModel.create({ 
        text: 'Government of Nepal - Ministry of Physical Infrastructure and Transport - Department of Transport Management - Nepal' 
      });
    }
    res.json({ result: marquee.text, message: 'Marquee fetched', meta: null });
  } catch (err) {
    next(err);
  }
};

const updateMarquee = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string') {
      return res.status(400).json({ message: 'Text is required' });
    }
    let marquee = await MarqueeModel.findOne();
    if (!marquee) {
      marquee = await MarqueeModel.create({ text });
    } else {
      marquee.text = text;
      await marquee.save();
    }
    res.json({ result: marquee.text, message: 'Marquee updated', meta: null });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMarquee, updateMarquee }; 