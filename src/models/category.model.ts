import mongoose, { Schema, Model } from "mongoose";
import { ICategorySchema } from "../../types/schemaTypes";

const CategorySchema: Schema<ICategorySchema> = new Schema({
    name: {
        type: String,
        required: true
    },
    categoryImage: {
        type: String,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    // owner: {
    //     type: Schema.Types.ObjectId,
    //     ref: "User",
    // },
}, { timestamps: true });


const CategoryModel:Model<ICategorySchema> = mongoose.model<ICategorySchema>('category',CategorySchema);
export default CategoryModel;
