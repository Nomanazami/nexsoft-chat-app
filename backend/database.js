const mongoose = require('mongoose');

// Flag to indicate if MongoDB is active
let isMongoActive = false;

// Mock Store for In-Memory DB fallback
const dbStore = {
  users: [],
  chats: [],
  messages: []
};

// Mock Query wrapper mimicking Mongoose chain methods
class MockQuery {
  constructor(promise) {
    this.promise = promise;
  }
  
  populate(path, select) {
    this.promise = this.promise.then(data => {
      if (!data) return data;
      const isArray = Array.isArray(data);
      const items = isArray ? data : [data];
      
      const populatedItems = items.map(item => {
        const itemCopy = { ...item };
        
        if (path === 'sender' || path === 'groupAdmin') {
          if (itemCopy[path]) {
            const user = dbStore.users.find(u => u._id.toString() === itemCopy[path].toString());
            if (user) {
              itemCopy[path] = selectFields(user, select);
            }
          }
        } else if (path === 'participants') {
          if (Array.isArray(itemCopy.participants)) {
            itemCopy.participants = itemCopy.participants.map(pId => {
              const user = dbStore.users.find(u => u._id.toString() === pId.toString());
              return user ? selectFields(user, select) : pId;
            });
          }
        } else if (path === 'lastMessage') {
          if (itemCopy.lastMessage) {
            const msg = dbStore.messages.find(m => m._id.toString() === itemCopy.lastMessage.toString());
            if (msg) {
              const msgCopy = { ...msg };
              const user = dbStore.users.find(u => u._id.toString() === msgCopy.sender.toString());
              if (user) {
                msgCopy.sender = selectFields(user, 'username avatar online');
              }
              itemCopy.lastMessage = msgCopy;
            }
          }
        }
        
        return itemCopy;
      });
      
      return isArray ? populatedItems : populatedItems[0];
    });
    return this;
  }
  
  sort(criteria) {
    this.promise = this.promise.then(data => {
      if (!Array.isArray(data)) return data;
      const key = Object.keys(criteria)[0];
      const dir = criteria[key];
      return [...data].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });
    });
    return this;
  }
  
  limit(count) {
    this.promise = this.promise.then(data => {
      if (!Array.isArray(data)) return data;
      return data.slice(0, count);
    });
    return this;
  }
  
  then(onFulfilled, onRejected) {
    return this.promise.then(onFulfilled, onRejected);
  }
  
  catch(onRejected) {
    return this.promise.catch(onRejected);
  }
}

function selectFields(user, select) {
  if (!select) return user;
  const fields = select.split(' ');
  const res = { _id: user._id };
  fields.forEach(f => {
    if (f && f !== '_id') {
      res[f] = user[f];
    }
  });
  return res;
}

// Mock Model Class
class MockModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }
  
  get collection() {
    return dbStore[this.collectionName];
  }
  
  create(data) {
    const item = {
      _id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    this.collection.push(item);
    return Promise.resolve(item);
  }
  
  find(query = {}) {
    const filter = (item) => {
      for (let key in query) {
        if (key === 'participants') {
          if (Array.isArray(item.participants)) {
            // Match if participant is in the array
            const qVal = query.participants.toString();
            if (!item.participants.some(p => p.toString() === qVal)) {
              return false;
            }
          } else {
            return false;
          }
        } else if (item[key] !== query[key]) {
          // If query[key] is object (e.g. { $ne: val })
          if (query[key] && typeof query[key] === 'object' && '$ne' in query[key]) {
            if (item[key] === query[key].$ne) return false;
          } else {
            return false;
          }
        }
      }
      return true;
    };
    const results = this.collection.filter(filter);
    return new MockQuery(Promise.resolve(results));
  }
  
  findOne(query = {}) {
    const filter = (item) => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    };
    const result = this.collection.find(filter) || null;
    return new MockQuery(Promise.resolve(result));
  }
  
  findById(id) {
    if (!id) return new MockQuery(Promise.resolve(null));
    const result = this.collection.find(item => item._id.toString() === id.toString()) || null;
    return new MockQuery(Promise.resolve(result));
  }
  
  findByIdAndUpdate(id, update, options = {}) {
    const index = this.collection.findIndex(item => item._id.toString() === id.toString());
    if (index === -1) return new MockQuery(Promise.resolve(null));
    
    const current = this.collection[index];
    const newFields = update.$set ? update.$set : update;
    const updated = {
      ...current,
      ...newFields,
      updatedAt: new Date()
    };
    this.collection[index] = updated;
    return new MockQuery(Promise.resolve(updated));
  }
  
  updateMany(query, update) {
    const newFields = update.$set ? update.$set : update;
    let modifiedCount = 0;
    this.collection.forEach((item, index) => {
      let matches = true;
      for (let key in query) {
        if (item[key] !== query[key]) matches = false;
      }
      if (matches) {
        this.collection[index] = {
          ...item,
          ...newFields,
          updatedAt: new Date()
        };
        modifiedCount++;
      }
    });
    return Promise.resolve({ modifiedCount });
  }
}

// REAL MONGOOSE SCHEMAS
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String, default: '' },
  online: { type: Boolean, default: false },
  statusMessage: { type: String, default: '' }
}, { timestamps: true });

const ChatSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  isGroup: { type: Boolean, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true }
}, { timestamps: true });

let User, Chat, Message;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';
  try {
    // Attempt Mongoose Connection with 3-second timeout to fail quickly if Mongo is not running
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    isMongoActive = true;
    console.log('💚 Database connected successfully (MongoDB)');
    
    User = mongoose.model('User', UserSchema);
    Chat = mongoose.model('Chat', ChatSchema);
    Message = mongoose.model('Message', MessageSchema);
  } catch (error) {
    console.warn('⚠️ MongoDB connection failed. Switching to In-Memory Fallback DB.');
    console.warn('Reason:', error.message);
    isMongoActive = false;
    
    // Instantiate Mock Models
    User = new MockModel('users');
    Chat = new MockModel('chats');
    Message = new MockModel('messages');
  }
};

module.exports = {
  connectDB,
  getModels: () => ({
    User,
    Chat,
    Message
  }),
  isMongo: () => isMongoActive
};
