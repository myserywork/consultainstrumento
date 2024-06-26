import { mongoose, Schema } from "mongoose";
import { mongoConnection,logger} from "../../di";

const { Schema } = mongoose;


mongoConnection.connect();


const blogSchema = new Schema({
    title: String, // String is shorthand for {type: String}
    author: String,
    body: String,
    comments: [{ body: String, date: Date }],
    date: { type: Date, default: Date.now },
    hidden: Boolean,
    meta: {
      votes: Number,
      favs: Number
    }
  });
  

  
const Blog = mongoose.model('Blog', blogSchema);

const blog = new Blog({ title: 'My first blog', author: 'Zia', body: 'This is my first blog' });
blog.save().then(() => logger.error('meow'));



export class SetupModels {

    constructor() {
        this.setupModels();
    }

  
    setupSchema(name, schema) {
        mongoose.model(name, schema);
    }

    getModel(name) {
        return mongoose.model(name);
    }

    getSchema(name) {
        return mongoose.model(name).schema;
    }

    getSchemaNames() {
        return mongoose.modelNames();
    }

    getSchemaByName(name) {
        return mongoose.model(name).schema;
    }

}