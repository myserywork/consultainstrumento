import mongoose from "mongoose";
const { Schema } = mongoose;

export const UserSchema = new Schema({
    name: String,
    email: String
});