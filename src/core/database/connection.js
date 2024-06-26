import mongoose from 'mongoose';

class MongoConnection {
  constructor(mongoURI) {
    this.mongoURI = mongoURI;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      console.warn('Mongoose is already connected.');
      return;
    }

    try {
      await mongoose.connect(this.mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      this.isConnected = true;
      console.log('Mongoose connected to MongoDB.');
    } catch (error) {
      console.error('Mongoose connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) {
      console.warn('Mongoose is not connected.');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Mongoose disconnected from MongoDB.');
    } catch (error) {
      console.error('Mongoose disconnection error:', error);
      throw error;
    }

    
  }
}

export default MongoConnection;