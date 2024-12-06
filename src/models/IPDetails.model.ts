import mongoose, { Schema } from "mongoose";
import { IActionDetails } from "../../types/schemaTypes"; 

const ActionDetailsSchema: Schema = new Schema({
    userId: { type: String, required: true }, 
    action: { type: String, required: true }, 
    ipAddress: { type: String, required: true }, 
    performedAt: { type: Date, default: Date.now }, 
});

export const ActionDetailsModel = mongoose.model<IActionDetails>("ActionDetails",ActionDetailsSchema);